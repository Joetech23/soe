'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hasAdminCredentials } from '@/lib/supabase/admin'
import { hasRole } from '@/lib/supabase/rpc'
import {
  writeSetting,
  type AppSettings,
  type SocialProvider,
  type VerificationMode,
} from '@/lib/settings'

export type ActionResult = { ok: boolean; message: string }

/**
 * Re-verify the admin role inside every action.
 *
 * The layout guard protects the *page*; a server action is a separately
 * callable endpoint and has to prove authorisation for itself.
 */
async function requireAdminUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')
  if (!(await hasRole(supabase, user.id, 'admin'))) throw new Error('Not authorised.')
  if (!hasAdminCredentials()) throw new Error('Server not configured.')
  return user
}

/** Settings that changed behaviour worth spelling out in the toast. */
const CONFIRMATIONS: Partial<Record<keyof AppSettings, (v: unknown) => string>> = {
  firstLoginVerification: (v) =>
    v === 'code'
      ? 'New parents will enter a code from their email.'
      : v === 'link'
        ? 'New parents will click a link in their email.'
        : 'Accounts now work immediately — no email check. Typos will lock people out.',
  allowRegistration: (v) =>
    v ? 'Anyone can create an account.' : 'New sign-ups are now closed.',
  notifyHomework: (v) =>
    v ? 'Parents will be emailed when you post homework.' : 'Homework emails are off.',
  notifyFeedback: (v) =>
    v ? 'Parents will be emailed when you post feedback.' : 'Feedback emails are off.',
  notifyOwnerSale: (v) =>
    v ? "You'll be emailed on every sale." : 'Sale emails to you are off.',
}

function confirm<K extends keyof AppSettings>(key: K, value: AppSettings[K]): string {
  return CONFIRMATIONS[key]?.(value) ?? 'Saved.'
}

async function save<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<ActionResult> {
  try {
    const user = await requireAdminUser()
    const res = await writeSetting(key, value, user.id)
    if (!res.ok) return { ok: false, message: res.message }

    // Settings feed the marketing pages (announcement) and the auth pages, so
    // the whole tree has to re-render, not just /admin.
    revalidatePath('/', 'layout')
    return { ok: true, message: confirm(key, value) }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Could not save that setting.',
    }
  }
}

/* --------------------------- one action per field -------------------------- */

export async function setVerificationMode(mode: VerificationMode): Promise<ActionResult> {
  if (!['code', 'link', 'off'].includes(mode)) {
    return { ok: false, message: 'Unknown verification mode.' }
  }
  return save('firstLoginVerification', mode)
}

export async function setAllowRegistration(on: boolean): Promise<ActionResult> {
  return save('allowRegistration', on)
}

export async function setNotifyHomework(on: boolean): Promise<ActionResult> {
  return save('notifyHomework', on)
}

export async function setNotifyFeedback(on: boolean): Promise<ActionResult> {
  return save('notifyFeedback', on)
}

export async function setNotifyOwnerSale(on: boolean): Promise<ActionResult> {
  return save('notifyOwnerSale', on)
}

export async function toggleSocialProvider(
  provider: SocialProvider,
  on: boolean,
  current: SocialProvider[]
): Promise<ActionResult> {
  const set = new Set(current)
  on ? set.add(provider) : set.delete(provider)
  const next = [...set].filter((p): p is SocialProvider =>
    ['google', 'facebook'].includes(p)
  )
  const res = await save('socialProviders', next)
  if (!res.ok) return res
  return {
    ok: true,
    message: on
      ? `${provider === 'google' ? 'Google' : 'Facebook'} sign-in is now offered.`
      : `${provider === 'google' ? 'Google' : 'Facebook'} sign-in is hidden.`,
  }
}

export async function saveAnnouncement(fd: FormData): Promise<ActionResult> {
  const text = String(fd.get('text') ?? '').trim().slice(0, 200)
  const enabled = fd.get('enabled') === 'on'

  if (enabled && text.length < 3) {
    return { ok: false, message: 'Write the announcement before switching it on.' }
  }

  const first = await save('announcementText', text)
  if (!first.ok) return first
  const second = await save('announcementEnabled', enabled)
  if (!second.ok) return second

  return {
    ok: true,
    message: enabled ? 'Announcement is live on the site.' : 'Announcement is hidden.',
  }
}
