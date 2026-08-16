import { NextResponse } from 'next/server'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { hashToken } from '@/lib/downloads'
import { rateLimit } from '@/lib/api-guard'
import { siteUrl } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Double opt-in confirmation. Looked up by sha256(token), so the raw value only
 * ever exists in the subscriber's inbox. Single-use: the hash is cleared once
 * redeemed.
 */
export async function GET(request: Request) {
  const limited = rateLimit(request, 'newsletter-confirm', 20, 60_000)
  if (limited) return limited

  const token = new URL(request.url).searchParams.get('token')
  if (!token || !hasAdminCredentials()) {
    return NextResponse.redirect(siteUrl('/newsletter?confirm=invalid'))
  }

  try {
    const supabase = createAdminClient()
    const { data: row } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('confirm_token_hash', hashToken(token))
      .maybeSingle()

    if (!row) {
      return NextResponse.redirect(siteUrl('/newsletter?confirm=invalid'))
    }

    await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirm_token_hash: null, // single use
      })
      .eq('id', row.id)

    return NextResponse.redirect(siteUrl('/newsletter?confirm=ok'))
  } catch (err) {
    console.error('[newsletter/confirm]', err)
    return NextResponse.redirect(siteUrl('/newsletter?confirm=error'))
  }
}
