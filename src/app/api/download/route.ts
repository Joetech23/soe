import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { rateLimit, clientIp } from '@/lib/api-guard'
import { hashToken, SIGNED_URL_TTL_SECONDS } from '@/lib/downloads'
import { siteUrl } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Secure digital delivery.
 *
 *   GET /api/download?asset=<assetId>[&t=<raw token>]
 *
 * Security model:
 *  - `product-files` is a PRIVATE bucket with no read policy for anon or
 *    authenticated. Nothing but the service role can read it.
 *  - Identity is resolved two ways: a signed-in session (cookies) OR a guest
 *    token, matched by sha256 so the DB never holds anything usable.
 *  - Entitlement is checked server-side; a revoked/expired one always fails.
 *  - record_download() enforces the per-hour abuse cap and writes the audit row
 *    in the same round trip.
 *  - The signed URL lives 60 seconds — long enough for the browser to start the
 *    download, worthless if leaked.
 *
 * Failure modes redirect to a friendly page rather than returning a bare 403,
 * because the person hitting them is usually a parent with a stale email link.
 */
function fail(reason: string) {
  return NextResponse.redirect(siteUrl(`/download/unavailable?reason=${reason}`))
}

export async function GET(request: Request) {
  const limited = rateLimit(request, 'download', 30, 60_000)
  if (limited) return limited

  const url = new URL(request.url)
  const assetId = url.searchParams.get('asset')
  const rawToken = url.searchParams.get('t')

  if (!assetId || !hasAdminCredentials()) return fail('unavailable')

  try {
    const admin = createAdminClient()

    // 1. Resolve the asset and its product (service role — the asset table has
    //    no public policy at all).
    const { data: asset } = await admin
      .from('product_assets')
      .select('id, product_id, storage_bucket, storage_path, video_id')
      .eq('id', assetId)
      .maybeSingle()

    if (!asset) return fail('notfound')

    // Streamed video is entitlement-gated at the page, never handed out as a file.
    if (!asset.storage_path) return fail('streamed')

    // 2. Establish who is asking.
    let email: string | null = null
    let delivery: 'account' | 'token' = 'account'

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.email) {
      email = user.email.toLowerCase()
    } else if (rawToken) {
      const { data: tok } = await admin
        .from('download_tokens')
        .select('email, expires_at, revoked_at')
        .eq('token_hash', hashToken(rawToken))
        .maybeSingle()

      if (!tok) return fail('invalid')
      if (tok.revoked_at) return fail('revoked')
      if (new Date(tok.expires_at) < new Date()) return fail('expired')

      email = tok.email.toLowerCase()
      delivery = 'token'
    }

    if (!email) return fail('signin')

    // 3. Entitlement check — the actual authorisation decision.
    const { data: ent } = await admin
      .from('entitlements')
      .select('id, revoked_at, expires_at')
      .eq('product_id', asset.product_id)
      .eq('email', email)
      .is('revoked_at', null)
      .maybeSingle()

    if (!ent) return fail('noaccess')

    // 4. Abuse cap + audit, atomically.
    const { data: verdict, error: rpcErr } = await admin.rpc('record_download', {
      p_entitlement_id: ent.id,
      p_asset_id: asset.id,
      p_delivery: delivery,
      p_ip: clientIp(request),
      p_user_agent: request.headers.get('user-agent')?.slice(0, 400) ?? null,
    } as never)

    if (rpcErr) throw rpcErr
    if (verdict !== 'OK') {
      return fail(String(verdict).toLowerCase())
    }

    if (delivery === 'token' && rawToken) {
      await admin
        .from('download_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('token_hash', hashToken(rawToken))
    }

    // 5. Short-lived signed URL, then hand off to the browser.
    const { data: signed, error: signErr } = await admin.storage
      .from(asset.storage_bucket)
      .createSignedUrl(asset.storage_path, SIGNED_URL_TTL_SECONDS, {
        download: true,
      })

    if (signErr || !signed?.signedUrl) throw signErr ?? new Error('sign failed')

    return NextResponse.redirect(signed.signedUrl, {
      status: 302,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (err) {
    console.error('[download]', err)
    return fail('error')
  }
}
