import { NextResponse } from 'next/server'
import { freeDownloadSchema } from '@/lib/schemas'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import {
  rateLimit,
  readJson,
  badRequest,
  serverError,
  sameOrigin,
  clientIp,
} from '@/lib/api-guard'
import { settleFreeOrder } from '@/lib/fulfilment'
import { mintToken, hashToken } from '@/lib/downloads'
import type { OrderRow, ProductRow } from '@/lib/supabase/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Free resource delivery in exchange for an email address.
 *
 * UK GDPR/PECR: the download is NOT conditional on the newsletter opt-in. The
 * email is collected to deliver the file (contractual basis); marketing consent
 * is a separate, unticked choice with its own record. Ticking it starts the
 * double opt-in flow — it never silently subscribes anyone.
 */
const CONSENT_TEXT =
  'Ticked the newsletter box while downloading a free resource on the Spirit of Excellence Tuition site.'

export async function POST(request: Request) {
  if (!sameOrigin(request)) return badRequest('Invalid request origin.', 403)
  const limited = rateLimit(request, 'free-download', 8, 60_000)
  if (limited) return limited

  const json = await readJson(request)
  if (json === null) return badRequest('Invalid request.')

  const parsed = freeDownloadSchema.safeParse(json)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Please check the form.')
  }
  const d = parsed.data
  if (d.company) return NextResponse.json({ ok: true })

  if (!hasAdminCredentials()) {
    return NextResponse.json(
      { error: 'Downloads are being set up. Please try again shortly.' },
      { status: 503 }
    )
  }

  try {
    const db = createAdminClient()
    const email = d.email.trim().toLowerCase()

    // Resolve the product server-side — never trust a price or id from the client.
    const { data: product } = await db
      .from('products')
      .select('*')
      .eq('slug', d.productSlug)
      .eq('active', true)
      .maybeSingle()

    if (!product) return badRequest('That resource is not available.', 404)
    const p = product as ProductRow
    if (!p.is_free) return badRequest('That resource is not free.', 400)

    // Create the order through the RPC so pricing and duplicate-ownership rules
    // are enforced in one place.
    const { data: created, error: orderErr } = await db.rpc('create_order', {
      p_items: [{ product_id: p.id }],
      p_customer_name: d.name || email.split('@')[0],
      p_customer_email: email,
      p_marketing_consent: d.marketingConsent,
      p_ip_country: null,
      p_source: 'free',
    } as never)

    let order = created as OrderRow | null

    if (orderErr) {
      // Already owns it → hand them a fresh link rather than an error.
      if (/ALREADY_OWNED/.test(orderErr.message)) {
        const { data: prev } = await db
          .from('orders')
          .select('*')
          .eq('customer_email', email)
          .eq('source', 'free')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (prev) {
          const raw = mintToken()
          await db.from('download_tokens').insert({
            token_hash: hashToken(raw),
            order_id: (prev as OrderRow).id,
            email,
          })
          return NextResponse.json({
            ok: true,
            alreadyOwned: true,
            downloadUrl: `/order/${(prev as OrderRow).order_number}?t=${encodeURIComponent(raw)}`,
          })
        }
      }
      throw orderErr
    }
    if (!order) throw new Error('order not created')

    const { downloadUrl } = await settleFreeOrder(db, order, p.name)

    // Newsletter opt-in is entirely separate from delivery.
    if (d.marketingConsent) {
      const raw = mintToken()
      await db.from('newsletter_subscribers').upsert(
        {
          email,
          full_name: d.name || null,
          status: 'pending',
          source: 'free_download',
          confirm_token_hash: hashToken(raw),
          consent_ip: clientIp(request),
          consent_text: CONSENT_TEXT,
        },
        { onConflict: 'email' }
      )
      // Confirmation email is fired by the newsletter flow; failure here must
      // never block the download.
    }

    return NextResponse.json({ ok: true, downloadUrl })
  } catch (err) {
    return serverError('free-download', err)
  }
}
