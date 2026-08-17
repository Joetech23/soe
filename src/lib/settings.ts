import 'server-only'
import { cache } from 'react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'

/**
 * Runtime settings Ms Betty can change from /admin/settings.
 *
 * Two rules make this safe to depend on anywhere:
 *
 *  1. Defaults live here, in code. A missing row — or a missing *table*, before
 *     the 0007 migration is applied — resolves to the default instead of
 *     throwing. Settings must never be able to take the site down.
 *  2. Reads use the service-role key from the server only. `app_settings` has
 *     no anon policy, so these values are never fetchable from the browser.
 */

export type VerificationMode = 'code' | 'link' | 'off'
export type SocialProvider = 'google' | 'facebook'

export type AppSettings = {
  /** How a brand-new account proves it owns its email address. */
  firstLoginVerification: VerificationMode
  /** Turn off new parent/customer sign-ups without taking the page down. */
  allowRegistration: boolean
  /** Social buttons to offer. Only shown if also enabled in Supabase. */
  socialProviders: SocialProvider[]
  /** Email linked parents when homework is posted. */
  notifyHomework: boolean
  /** Email linked parents when lesson feedback is posted. */
  notifyFeedback: boolean
  /** Email Ms Betty when a sale comes in. */
  notifyOwnerSale: boolean
  /** Site-wide announcement bar. */
  announcementEnabled: boolean
  announcementText: string
}

export const SETTING_DEFAULTS: AppSettings = {
  // 'code' by default: Supabase has "confirm email" on, so a new account cannot
  // sign in until the address is verified. A code keeps the parent on our own
  // branded page instead of bouncing them through an inbox round trip.
  firstLoginVerification: 'code',
  allowRegistration: true,
  socialProviders: [],
  notifyHomework: true,
  notifyFeedback: true,
  notifyOwnerSale: true,
  announcementEnabled: false,
  announcementText: '',
}

/** Storage key per setting. Keeping these explicit stops a rename silently
 *  orphaning a stored row. */
const KEYS: Record<keyof AppSettings, string> = {
  firstLoginVerification: 'auth.first_login_verification',
  allowRegistration: 'auth.allow_registration',
  socialProviders: 'auth.social_providers',
  notifyHomework: 'notify.homework',
  notifyFeedback: 'notify.feedback',
  notifyOwnerSale: 'notify.owner_sale',
  announcementEnabled: 'site.announcement_enabled',
  announcementText: 'site.announcement_text',
}

const VERIFICATION_MODES: VerificationMode[] = ['code', 'link', 'off']
const PROVIDERS: SocialProvider[] = ['google', 'facebook']

/** Coerce whatever is in the JSONB column into the declared shape. A hand-edited
 *  row must not be able to produce a nonsense setting. */
function coerce<K extends keyof AppSettings>(key: K, raw: unknown): AppSettings[K] {
  const fallback = SETTING_DEFAULTS[key]
  if (raw === null || raw === undefined) return fallback

  if (typeof fallback === 'boolean') {
    return (typeof raw === 'boolean' ? raw : fallback) as AppSettings[K]
  }
  if (key === 'firstLoginVerification') {
    return (VERIFICATION_MODES.includes(raw as VerificationMode)
      ? raw
      : fallback) as AppSettings[K]
  }
  if (key === 'socialProviders') {
    if (!Array.isArray(raw)) return fallback
    return raw.filter((p): p is SocialProvider =>
      PROVIDERS.includes(p as SocialProvider)
    ) as AppSettings[K]
  }
  if (typeof fallback === 'string') {
    return (typeof raw === 'string' ? raw.slice(0, 300) : fallback) as AppSettings[K]
  }
  return fallback
}

/**
 * Settings for this request. `cache` dedupes so a page reading settings in
 * three components still makes one query.
 */
export const getSettings = cache(async (): Promise<AppSettings> => {
  if (!hasAdminCredentials()) return { ...SETTING_DEFAULTS }

  try {
    const db = createAdminClient()
    const { data, error } = await db.from('app_settings').select('key, value')

    // Table not created yet (migration 0007 unapplied) — defaults are correct.
    if (error) {
      if (!/does not exist|schema cache/i.test(error.message)) {
        console.error('[settings] read failed:', error.message)
      }
      return { ...SETTING_DEFAULTS }
    }

    const byKey = new Map(
      ((data ?? []) as { key: string; value: unknown }[]).map((r) => [r.key, r.value])
    )
    const out = { ...SETTING_DEFAULTS }
    for (const k of Object.keys(KEYS) as (keyof AppSettings)[]) {
      if (byKey.has(KEYS[k])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(out as any)[k] = coerce(k, byKey.get(KEYS[k]))
      }
    }
    return out
  } catch (err) {
    console.error('[settings] read threw', err)
    return { ...SETTING_DEFAULTS }
  }
})

/** Write one setting. Callers must have already verified the admin role. */
export async function writeSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasAdminCredentials()) {
    return { ok: false, message: 'Server is missing its Supabase service key.' }
  }
  const db = createAdminClient()
  const { error } = await db
    .from('app_settings')
    .upsert(
      { key: KEYS[key], value: value as never, updated_by: userId, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )

  if (error) {
    if (/does not exist|schema cache/i.test(error.message)) {
      return {
        ok: false,
        message:
          'Settings table not found — apply supabase/migrations/20260817_0007_app_settings.sql first.',
      }
    }
    console.error('[settings] write failed:', error.message)
    return { ok: false, message: 'Could not save that setting.' }
  }
  return { ok: true }
}

/**
 * Which OAuth providers are actually switched on in the Supabase project.
 *
 * Asked of Supabase rather than assumed, so the admin page can say "Google is
 * not enabled in Supabase yet" instead of rendering a button that dead-ends on
 * an error page. Unauthenticated endpoint; safe to call server-side.
 */
export const getEnabledProviders = cache(async (): Promise<SocialProvider[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return []
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anon },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const json = (await res.json()) as { external?: Record<string, boolean> }
    return PROVIDERS.filter((p) => json.external?.[p] === true)
  } catch {
    return []
  }
})

/**
 * Social buttons to render: enabled in Supabase *and* switched on by Ms Betty.
 * Both must agree, so a half-finished setup never shows a broken button.
 */
export async function activeSocialProviders(): Promise<SocialProvider[]> {
  const [settings, enabled] = await Promise.all([getSettings(), getEnabledProviders()])
  return settings.socialProviders.filter((p) => enabled.includes(p))
}

export const PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
}
