import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Service-role client. BYPASSES Row Level Security — never import this into a
 * client component or expose the key. Use only in trusted server code (route
 * handlers, webhooks, cron) to create orders, grant entitlements, mint signed
 * download URLs and read customer data.
 *
 * Guarded so a missing key fails loudly at call time rather than silently
 * creating a broken client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase admin client unavailable: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** True when the server has the service-role key configured. */
export function hasAdminCredentials(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}
