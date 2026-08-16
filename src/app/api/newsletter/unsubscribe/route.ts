import { NextResponse } from 'next/server'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { hashToken } from '@/lib/downloads'
import { rateLimit } from '@/lib/api-guard'
import { siteUrl } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * One-click unsubscribe. Legally required in every marketing email (PECR), and
 * it must work without asking the person to sign in or confirm anything.
 *
 * Token-based so the URL cannot be used to enumerate or unsubscribe arbitrary
 * addresses. Always reports success — never reveals whether an address existed.
 */
export async function GET(request: Request) {
  const limited = rateLimit(request, 'unsubscribe', 20, 60_000)
  if (limited) return limited

  const token = new URL(request.url).searchParams.get('token')
  if (!token || !hasAdminCredentials()) {
    return NextResponse.redirect(siteUrl('/newsletter?unsub=done'))
  }

  try {
    const supabase = createAdminClient()
    await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
        confirm_token_hash: null,
      })
      .eq('confirm_token_hash', hashToken(token))
  } catch (err) {
    console.error('[newsletter/unsubscribe]', err)
  }

  return NextResponse.redirect(siteUrl('/newsletter?unsub=done'))
}

/** POST handles List-Unsubscribe=One-Click, which some clients send. */
export async function POST(request: Request) {
  return GET(request)
}
