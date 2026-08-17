import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types'
import { hasRole } from './rpc'

type CookieToSet = { name: string; value: string; options?: CookieOptions }

/**
 * Short-lived cache of "is this user an admin".
 *
 * The middleware runs on every request to /admin and /account — including the
 * RSC payload fetches Next fires while prefetching links — and each run was
 * making TWO sequential calls to Supabase: `getUser()` to validate the session,
 * then a `has_role` RPC. That second round trip is what made moving around the
 * admin feel slow.
 *
 * The role almost never changes, so it is cached per user for a minute. Worst
 * case a role change takes up to 60s to take effect in the middleware; every
 * admin layout and every server action re-checks the role independently, so
 * this is a speed cache, never the security boundary.
 */
const ROLE_TTL_MS = 60_000
const roleCache = new Map<string, { isAdmin: boolean; expires: number }>()

async function isAdminCached(
  client: Parameters<typeof hasRole>[0],
  userId: string
): Promise<boolean> {
  const now = Date.now()
  const hit = roleCache.get(userId)
  if (hit && hit.expires > now) return hit.isAdmin

  if (roleCache.size > 500) {
    for (const [k, v] of roleCache) if (v.expires <= now) roleCache.delete(k)
  }

  const isAdmin = await hasRole(client, userId, 'admin')
  roleCache.set(userId, { isAdmin, expires: now + ROLE_TTL_MS })
  return isAdmin
}

/**
 * Refreshes the auth session on every request and guards the /admin and
 * /account areas.
 *
 * Unlike a "signed-in or not" gate, /admin/* also verifies the admin role here,
 * in the middleware — otherwise a signed-in parent gets a flash of the admin
 * shell before the layout bounces them. The layout re-checks as defence in
 * depth.
 */
export async function updateSession(request: NextRequest) {
  // Preview flag: view the admin UI with placeholder data before auth is live.
  // Remove ADMIN_PREVIEW for launch so the real session guard applies.
  if (
    process.env.ADMIN_PREVIEW === 'true' &&
    request.nextUrl.pathname.startsWith('/admin')
  ) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // --- Admin (staff) area ---
  const isAdmin = pathname.startsWith('/admin')
  const isAdminLogin = pathname === '/admin/login'
  if (isAdmin && !isAdminLogin) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
    // Verify the admin role, not just "is signed in".
    const isAdminRole = await isAdminCached(supabase, user.id)
    if (!isAdminRole) {
      const url = request.nextUrl.clone()
      url.pathname = '/account'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }
  if (isAdminLogin && user) {
    const isAdminRole = await isAdminCached(supabase, user.id)
    if (isAdminRole) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  // --- Customer account area ---
  const isAccount = pathname.startsWith('/account')
  const isAccountAuth =
    pathname === '/account/login' || pathname === '/account/register'
  if (isAccount && !isAccountAuth && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/account/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  if (isAccountAuth && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/account'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
