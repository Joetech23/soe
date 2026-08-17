import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { siteUrl } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Consumes an emailed `token_hash` and sets the session cookie.
 *
 * Every link we email points here, on our own domain, rather than at
 * Supabase's `/auth/v1/verify` endpoint. Two reasons, and the second is the
 * important one:
 *
 *  1. Branding — a parent sees a soetuition.com link, not a
 *     project-ref.supabase.co one.
 *  2. Correctness — Supabase rewrites `redirect_to` to the project's Site URL
 *     when the target is not in its allow-list. That list is dashboard state
 *     nobody can see from the code, and getting it wrong sends people to
 *     whatever the Site URL happens to be. Owning the link removes that
 *     failure mode: the token is verified here and the redirect is ours.
 */
const ALLOWED: EmailOtpType[] = ['magiclink', 'signup', 'recovery', 'invite', 'email_change']

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const rawNext = url.searchParams.get('next') ?? '/account'

  // Never bounce to an attacker-supplied host.
  const next = rawNext.startsWith('/') ? rawNext : '/account'

  if (!tokenHash || !type || !ALLOWED.includes(type)) {
    return NextResponse.redirect(siteUrl('/account/login?error=bad_link'))
  }

  const supabase = createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

  if (error) {
    console.error('[auth/confirm]', type, error.message)
    return NextResponse.redirect(siteUrl('/account/login?error=expired'))
  }

  return NextResponse.redirect(siteUrl(next))
}
