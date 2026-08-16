import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { siteUrl } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Exchanges a magic-link / email-confirmation code for a session cookie.
 * Supabase redirects here after the user clicks the link in their email.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/account'

  if (!code) {
    return NextResponse.redirect(siteUrl('/account/login?error=missing_code'))
  }

  const supabase = createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback]', error.message)
    return NextResponse.redirect(siteUrl('/account/login?error=expired'))
  }

  // Only allow same-site redirects — never bounce to an attacker-supplied host.
  const safeNext = next.startsWith('/') ? next : '/account'
  return NextResponse.redirect(siteUrl(safeNext))
}
