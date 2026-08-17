'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { redeemInviteCode } from '@/lib/supabase/rpc'
import { sendEmail } from '@/lib/email/send'
import {
  verifyCodeEmail,
  signInLinkEmail,
  accountExistsEmail,
  passwordResetEmail,
} from '@/lib/email/templates'
import { getSettings } from '@/lib/settings'
import { hit } from '@/lib/api-guard'
import { siteUrl } from '@/lib/utils'

/**
 * Own the auth emails.
 *
 * Supabase's built-in mailer sends from `noreply@mail.app.supabase.io` with its
 * own template — visibly not Ms Betty. So instead of letting the client call
 * `signInWithOtp`, these actions mint the code or link with the admin API
 * (`generateLink`, which generates without sending) and post it through Resend
 * using our own templates.
 *
 * Two things worth knowing about this path, both established by probing the
 * live project rather than assumed:
 *
 *  - `generateLink` returns `email_otp`, an 8-digit code, and `verifyOtp`
 *    accepts it and sets `email_confirmed_at`. That confirmed flag is what
 *    makes "first time only" work: once set, password sign-in just succeeds and
 *    no code is ever sent again.
 *  - `generateLink({ type: 'signup' })` on an address that already has a
 *    CONFIRMED account fails with "A user with this email address has already
 *    been registered". Surfacing that verbatim would turn the sign-up form into
 *    an account-enumeration oracle — type an address, learn whether it is a
 *    customer. So `startRegistration` looks the address up first and answers
 *    identically either way, mailing the person who actually owns the inbox.
 *    (Passwords are never overwritten; Supabase rejects the call outright.)
 */

export type AuthResult =
  | { ok: true; step: 'code'; email: string; message: string }
  | { ok: true; step: 'link'; email: string; message: string }
  | { ok: true; step: 'done'; message: string }
  | { ok: false; message: string }

const GENERIC_SENT =
  'Check your inbox — if that address can be registered, a message is on its way.'

function ip(): string {
  const h = headers()
  const xff = h.get('x-forwarded-for')
  return xff?.split(',')[0].trim() ?? h.get('x-real-ip') ?? 'unknown'
}

/** Audit trail. Never throws and never records a code. */
async function audit(kind: string, email: string | null, detail?: string) {
  if (!hasAdminCredentials()) return
  try {
    await createAdminClient()
      .from('auth_events')
      .insert({ email, kind, detail: detail?.slice(0, 300) ?? null, ip: ip() })
  } catch {
    /* the table may not exist yet — auditing must never block a sign-in */
  }
}

function cleanEmail(raw: FormDataEntryValue | null): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 254)
}

function looksLikeEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(v)
}

/**
 * Build the emailed link on our own domain from `generateLink`'s `hashed_token`.
 *
 * Not `properties.action_link`: that points at project-ref.supabase.co, and
 * Supabase silently rewrites its `redirect_to` to the project's Site URL when
 * the target is not in the dashboard allow-list — which currently means a
 * production link would land on localhost. /auth/confirm verifies the hash
 * itself, so the allow-list stops mattering.
 */
function confirmUrl(
  hashedToken: string,
  type: 'signup' | 'magiclink' | 'recovery',
  next: string
): string {
  const q = new URLSearchParams({ token_hash: hashedToken, type, next })
  return siteUrl(`/auth/confirm?${q.toString()}`)
}

/** Does an account already exist for this address? */
async function findUserByEmail(email: string) {
  const db = createAdminClient()
  // listUsers is paginated; the filter keeps it to one page in practice.
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
  return data?.users?.find((u) => u.email?.toLowerCase() === email) ?? null
}

/* ========================================================================== */
/*  Registration                                                              */
/* ========================================================================== */
export async function startRegistration(fd: FormData): Promise<AuthResult> {
  const email = cleanEmail(fd.get('email'))
  const password = String(fd.get('password') ?? '')
  const invite = String(fd.get('invite') ?? '').trim().toUpperCase()

  if (!looksLikeEmail(email)) return { ok: false, message: 'Enter a valid email address.' }
  if (password.length < 8) {
    return { ok: false, message: 'Choose a password of at least 8 characters.' }
  }
  if (!hasAdminCredentials()) {
    return { ok: false, message: 'Sign-up is temporarily unavailable. Please try later.' }
  }

  const settings = await getSettings()
  if (!settings.allowRegistration) {
    return {
      ok: false,
      message: 'New accounts are closed at the moment. Please contact Ms Betty.',
    }
  }

  // Per-address and per-IP limits. The address limit stops someone mailbombing
  // one parent; the IP limit stops a script working through a list.
  const byEmail = hit(`reg:${email}`, 4, 60 * 60 * 1000)
  const byIp = hit(`reg-ip:${ip()}`, 12, 60 * 60 * 1000)
  if (!byEmail.ok || !byIp.ok) {
    await audit('failed', email, 'registration rate limited')
    return { ok: false, message: 'Too many attempts. Please try again a bit later.' }
  }

  const db = createAdminClient()

  try {
    const existing = await findUserByEmail(email)

    // Existing account: calling generateLink({type:'signup'}) here would fail
    // with "already been registered", and passing that back would let anyone
    // test addresses against the customer list. Send a sign-in link to the
    // inbox instead and return the same message as a fresh registration, so
    // the screen reveals nothing either way.
    if (existing) {
      const { data: link } = await db.auth.admin.generateLink({
        type: 'magiclink',
        email,
      })
      if (link?.properties?.hashed_token) {
        const tpl = accountExistsEmail({
          url: confirmUrl(link.properties.hashed_token, 'magiclink', '/account'),
        })
        await sendEmail({ to: email, ...tpl, tag: 'account-exists' })
      }
      await audit('link_sent', email, 'registration attempt on existing account')
      return { ok: true, step: 'link', email, message: GENERIC_SENT }
    }

    /* ---- brand new account ---- */

    // 'off': create the account confirmed and let them straight in.
    if (settings.firstLoginVerification === 'off') {
      const { error } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: invite ? { pending_invite: invite } : {},
      })
      if (error) throw error
      await audit('verified', email, 'auto-confirmed (verification off)')
      return {
        ok: true,
        step: 'done',
        message: 'Your account is ready — signing you in.',
      }
    }

    // 'code' or 'link': generateLink creates the user unconfirmed and hands us
    // both an 8-digit code and a clickable link. We choose which to send.
    const { data: link, error } = await db.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: { data: invite ? { pending_invite: invite } : {} },
    })
    if (error) throw error

    if (settings.firstLoginVerification === 'link') {
      const hashed = link?.properties?.hashed_token
      if (!hashed) throw new Error('no hashed_token')
      const url = confirmUrl(hashed, 'signup', '/account')
      const tpl = signInLinkEmail({ url, firstTime: true })
      const sent = await sendEmail({ to: email, ...tpl, tag: 'confirm-link' })
      if (sent.status === 'failed') {
        return { ok: false, message: 'We could not send that email. Please try again.' }
      }
      await audit('link_sent', email, 'registration')
      return {
        ok: true,
        step: 'link',
        email,
        message: 'Check your inbox for a confirmation link.',
      }
    }

    const code = link?.properties?.email_otp
    if (!code) throw new Error('no email_otp')
    const tpl = verifyCodeEmail({ code })
    const sent = await sendEmail({ to: email, ...tpl, tag: 'verify-code' })
    if (sent.status === 'failed') {
      return { ok: false, message: 'We could not send that code. Please try again.' }
    }
    await audit('code_sent', email, 'registration')
    return {
      ok: true,
      step: 'code',
      email,
      message: 'We have emailed you a code.',
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error('[auth] startRegistration failed:', msg)
    await audit('failed', email, msg)
    if (/password/i.test(msg) && /weak|short|characters/i.test(msg)) {
      return { ok: false, message: 'Please choose a stronger password.' }
    }
    return { ok: false, message: 'Could not create your account. Please try again.' }
  }
}

/* ========================================================================== */
/*  Verify the code                                                           */
/* ========================================================================== */
export async function verifyCode(
  emailRaw: string,
  codeRaw: string
): Promise<AuthResult & { linkedChild?: boolean }> {
  const email = cleanEmail(emailRaw)
  const code = codeRaw.replace(/\D/g, '')

  if (!looksLikeEmail(email)) return { ok: false, message: 'Enter a valid email address.' }
  if (code.length < 6) return { ok: false, message: 'Enter the code from your email.' }

  // Tight limit: this is the one endpoint where guessing gets you a session.
  const guard = hit(`otp:${email}`, 8, 15 * 60 * 1000)
  if (!guard.ok) {
    await audit('failed', email, 'otp rate limited')
    return {
      ok: false,
      message: 'Too many attempts. Wait a few minutes, then request a new code.',
    }
  }

  const supabase = createClient()

  // A code minted by type 'signup' verifies as 'signup'; one minted by
  // 'magiclink' verifies as 'magiclink'. We do not know which produced this
  // code, so try both — 'email' is accepted for either but being explicit
  // keeps the failure message accurate.
  let lastMessage = 'That code is not right, or it has expired.'
  for (const type of ['signup', 'magiclink', 'email'] as const) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type })
    if (!error && data.session) {
      const linkedChild = await redeemPendingInvite()
      await audit('verified', email, 'code')
      return {
        ok: true,
        step: 'done',
        message: linkedChild
          ? "You're in — your child's portal is linked."
          : "You're in. Welcome!",
        linkedChild,
      }
    }
    if (error) lastMessage = /expired|invalid/i.test(error.message)
      ? 'That code is not right, or it has expired. Ask for a new one.'
      : error.message
  }

  await audit('failed', email, 'bad code')
  return { ok: false, message: lastMessage }
}

/**
 * Redeem the invite code stashed at registration.
 *
 * Runs after the session exists, so `redeem_invite_code` sees a real
 * `auth.uid()`. Failure is swallowed deliberately: a bad code must not block
 * someone from reaching their account — they can enter it again from the
 * portal.
 */
async function redeemPendingInvite(): Promise<boolean> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const pending = user?.user_metadata?.pending_invite
    if (!user || typeof pending !== 'string' || !pending) return false

    await redeemInviteCode(supabase, pending)

    // Clear it so a stale code is not retried on every sign-in.
    if (hasAdminCredentials()) {
      await createAdminClient()
        .auth.admin.updateUserById(user.id, { user_metadata: { pending_invite: null } })
        .catch(() => {})
    }
    return true
  } catch (err) {
    console.warn('[auth] pending invite not redeemed:', err instanceof Error ? err.message : err)
    return false
  }
}

/* ========================================================================== */
/*  Resend a code                                                             */
/* ========================================================================== */
export async function resendCode(emailRaw: string): Promise<AuthResult> {
  const email = cleanEmail(emailRaw)
  if (!looksLikeEmail(email)) return { ok: false, message: 'Enter a valid email address.' }
  if (!hasAdminCredentials()) {
    return { ok: false, message: 'Temporarily unavailable. Please try later.' }
  }

  const guard = hit(`resend:${email}`, 3, 15 * 60 * 1000)
  if (!guard.ok) {
    return {
      ok: false,
      message: `Please wait ${Math.ceil(guard.retryAfter / 60)} minute(s) before asking for another code.`,
    }
  }

  try {
    const db = createAdminClient()
    const existing = await findUserByEmail(email)
    if (!existing) {
      // Don't confirm or deny. Nothing to send.
      return { ok: true, step: 'code', email, message: GENERIC_SENT }
    }

    const { data: link, error } = await db.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (error) throw error

    const code = link?.properties?.email_otp
    if (!code) throw new Error('no email_otp')
    const tpl = verifyCodeEmail({ code })
    await sendEmail({ to: email, ...tpl, tag: 'verify-code' })
    await audit('code_sent', email, 'resend')
    return { ok: true, step: 'code', email, message: 'A new code is on its way.' }
  } catch (err) {
    console.error('[auth] resendCode failed:', err instanceof Error ? err.message : err)
    return { ok: false, message: 'Could not send a new code. Please try again.' }
  }
}

/* ========================================================================== */
/*  Email me a sign-in link (branded replacement for signInWithOtp)           */
/* ========================================================================== */
export async function sendSignInLink(emailRaw: string, next = '/account'): Promise<AuthResult> {
  const email = cleanEmail(emailRaw)
  if (!looksLikeEmail(email)) return { ok: false, message: 'Enter a valid email address.' }
  if (!hasAdminCredentials()) {
    return { ok: false, message: 'Temporarily unavailable. Please try later.' }
  }

  const guard = hit(`link:${email}`, 5, 30 * 60 * 1000)
  if (!guard.ok) return { ok: false, message: 'Too many requests. Please try again shortly.' }

  const safeNext = next.startsWith('/') ? next : '/account'

  try {
    const existing = await findUserByEmail(email)
    if (existing) {
      const { data: link, error } = await createAdminClient().auth.admin.generateLink({
        type: 'magiclink',
        email,
      })
      if (error) throw error
      const hashed = link?.properties?.hashed_token
      if (hashed) {
        const tpl = signInLinkEmail({ url: confirmUrl(hashed, 'magiclink', safeNext) })
        await sendEmail({ to: email, ...tpl, tag: 'signin-link' })
        await audit('link_sent', email, 'requested')
      }
    }
    // Same answer whether or not the account exists.
    return { ok: true, step: 'link', email, message: GENERIC_SENT }
  } catch (err) {
    console.error('[auth] sendSignInLink failed:', err instanceof Error ? err.message : err)
    return { ok: true, step: 'link', email, message: GENERIC_SENT }
  }
}

/* ========================================================================== */
/*  Password reset                                                            */
/* ========================================================================== */
export async function sendPasswordReset(emailRaw: string): Promise<AuthResult> {
  const email = cleanEmail(emailRaw)
  if (!looksLikeEmail(email)) return { ok: false, message: 'Enter a valid email address.' }
  if (!hasAdminCredentials()) {
    return { ok: false, message: 'Temporarily unavailable. Please try later.' }
  }

  const guard = hit(`reset:${email}`, 4, 60 * 60 * 1000)
  if (!guard.ok) return { ok: false, message: 'Too many requests. Please try again later.' }

  try {
    const existing = await findUserByEmail(email)
    if (existing) {
      const { data: link, error } = await createAdminClient().auth.admin.generateLink({
        type: 'recovery',
        email,
      })
      if (error) throw error
      const hashed = link?.properties?.hashed_token
      if (hashed) {
        const tpl = passwordResetEmail({
          url: confirmUrl(hashed, 'recovery', '/account/new-password'),
        })
        await sendEmail({ to: email, ...tpl, tag: 'password-reset' })
        await audit('reset_sent', email)
      }
    }
    return {
      ok: true,
      step: 'link',
      email,
      message: 'If that address has an account, a reset link is on its way.',
    }
  } catch (err) {
    console.error('[auth] sendPasswordReset failed:', err instanceof Error ? err.message : err)
    return {
      ok: true,
      step: 'link',
      email,
      message: 'If that address has an account, a reset link is on its way.',
    }
  }
}

/**
 * Set a new password. Requires the recovery session that /auth/confirm already
 * established — `updateUser` acts on the signed-in user, so there is no way to
 * aim this at somebody else's account.
 */
export async function setNewPassword(fd: FormData): Promise<AuthResult> {
  const password = String(fd.get('password') ?? '')
  const confirm = String(fd.get('confirm') ?? '')

  if (password.length < 8) {
    return { ok: false, message: 'Choose a password of at least 8 characters.' }
  }
  if (password !== confirm) return { ok: false, message: 'Those passwords do not match.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, message: 'That reset link has expired. Please request a new one.' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    console.error('[auth] setNewPassword failed:', error.message)
    return {
      ok: false,
      message: /weak|short|characters|pwned|compromis/i.test(error.message)
        ? 'Please choose a stronger password.'
        : 'Could not save that password. Please try again.',
    }
  }

  await audit('verified', user.email ?? null, 'password reset')
  return { ok: true, step: 'done', message: 'Password saved. You are signed in.' }
}

/* ========================================================================== */
/*  Password sign-in                                                          */
/* ========================================================================== */
/**
 * Signing in with a password. After the first verification this is the only
 * step a parent ever sees.
 *
 * Supabase blocks password sign-in for an unconfirmed address, so an account
 * that never finished verification lands back on the code screen rather than a
 * dead end.
 */
export async function signInWithPassword(
  fd: FormData
): Promise<AuthResult & { needsVerification?: boolean }> {
  const email = cleanEmail(fd.get('email'))
  const password = String(fd.get('password') ?? '')
  if (!looksLikeEmail(email) || !password) {
    return { ok: false, message: 'Enter your email and password.' }
  }

  const guard = hit(`pw:${email}`, 10, 15 * 60 * 1000)
  const guardIp = hit(`pw-ip:${ip()}`, 30, 15 * 60 * 1000)
  if (!guard.ok || !guardIp.ok) {
    await audit('failed', email, 'password rate limited')
    return { ok: false, message: 'Too many attempts. Please wait a few minutes.' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (!error) {
    // Covers a social-first account that later set a password, and the 'off'
    // mode where the invite was stashed but never redeemed.
    const linked = await redeemPendingInvite()
    await audit('verified', email, 'password')
    return {
      ok: true,
      step: 'done',
      message: linked ? "Signed in — your child's portal is linked." : 'Signed in.',
    }
  }

  if (/not confirmed/i.test(error.message)) {
    const again = await resendCode(email)
    return {
      ok: false,
      needsVerification: true,
      message: again.ok
        ? 'Your email is not confirmed yet — we have sent you a fresh code.'
        : 'Your email is not confirmed yet. Ask for a new code below.',
    }
  }

  await audit('failed', email, 'bad password')
  // Never distinguish "no such account" from "wrong password".
  return { ok: false, message: 'That email and password combination is not right.' }
}
