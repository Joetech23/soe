import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { siteUrl } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Sign out. A POST route rather than a client-side call so the auth cookies are
 * cleared on the server response — a client-only signOut leaves the httpOnly
 * cookies in place, which is why "logout" appeared to do nothing.
 */
async function signOut(request: Request) {
  const supabase = createClient()
  await supabase.auth.signOut()

  const to = new URL(request.url).searchParams.get('next') ?? '/'
  const res = NextResponse.redirect(siteUrl(to), { status: 303 })
  res.headers.set('Cache-Control', 'no-store, max-age=0')
  return res
}

export async function POST(request: Request) {
  return signOut(request)
}

/** GET support so a plain link works too (e.g. from an email or bookmark). */
export async function GET(request: Request) {
  return signOut(request)
}
