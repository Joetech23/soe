import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

type CookieToSet = { name: string; value: string; options?: CookieOptions }

/**
 * Server client bound to the request cookies — carries the signed-in user's
 * session, so RLS applies as that user. Use in Server Components, route
 * handlers and middleware.
 */
export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // called from a Server Component — safe to ignore, middleware refreshes
          }
        },
      },
    }
  )
}
