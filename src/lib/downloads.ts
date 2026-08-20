import 'server-only'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Guest download tokens.
 *
 * The RAW token only ever exists in the customer's email. We persist
 * sha256(raw), so a database leak hands out nothing usable — an attacker would
 * need to reverse SHA-256 over a 256-bit random value.
 */

/** 32 random bytes → 43-char URL-safe string. */
export function mintToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/**
 * Constant-time compare for any place we compare secrets directly (e.g. the
 * cron secret). Lookups by token_hash are already safe — this is for headers.
 */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/** Signed-URL lifetime. Short on purpose: it goes straight into the download. */
export const SIGNED_URL_TTL_SECONDS = 60

/**
 * Guest link lifetime.
 *
 * null = never expires. A parent who bought a phonics PDF re-downloading it in
 * three years on a new phone is a good customer, not an attacker — and every
 * expiry did was generate "I lost my file" emails. Refunds and abuse are
 * handled by `revoked_at`, which is the control that actually matters.
 */
export const TOKEN_TTL_DAYS: number | null = null

/** Per-entitlement abuse cap, enforced in the record_download RPC. */
export const DOWNLOADS_PER_HOUR = 10
