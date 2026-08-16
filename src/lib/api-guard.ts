import 'server-only'
import { NextResponse } from 'next/server'

/**
 * Request guards for public API routes.
 *
 * SCOPE NOTE: the rate limiter is an in-process Map. It is correct for a single
 * instance and is real protection against casual abuse, but it resets per
 * serverless instance and is NOT shared across regions. Before meaningful
 * traffic, swap `hit()` for Upstash Redis — the interface is deliberately tiny
 * so that is a one-file change.
 */

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

// Opportunistic sweep so the Map cannot grow unbounded on a long-lived instance.
function sweep(now: number) {
  if (buckets.size < 5000) return
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
}

export function hit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  sweep(now)
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  b.count += 1
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
  }
  return { ok: true, retryAfter: 0 }
}

/**
 * Best-effort client IP. Trusts x-forwarded-for only because Vercel/most
 * platforms overwrite it at the edge; never use this for authorisation.
 */
export function clientIp(request: Request): string {
  const h = request.headers
  const xff = h.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return h.get('x-real-ip') ?? h.get('cf-connecting-ip') ?? 'unknown'
}

export function rateLimit(
  request: Request,
  scope: string,
  limit = 10,
  windowMs = 60_000
) {
  const res = hit(`${scope}:${clientIp(request)}`, limit, windowMs)
  if (res.ok) return null
  return NextResponse.json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(res.retryAfter) } }
  )
}

const MAX_BODY_BYTES = 32 * 1024 // 32 KB — generous for our forms, tiny for abuse

/**
 * Reads a JSON body with a hard size cap, so an attacker cannot exhaust memory
 * by streaming a huge payload at a public endpoint.
 */
export async function readJson(request: Request): Promise<unknown | null> {
  const len = request.headers.get('content-length')
  if (len && Number(len) > MAX_BODY_BYTES) return null
  const type = request.headers.get('content-type') ?? ''
  if (!type.includes('application/json')) return null
  try {
    const text = await request.text()
    if (text.length > MAX_BODY_BYTES) return null
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

/**
 * Same-origin check for state-changing public routes. Browsers always send
 * Origin on cross-origin POSTs, so a mismatch means it did not come from our
 * own pages. Requests with no Origin (server-to-server, curl) are allowed
 * through — they are handled by the route's own auth/secret checks.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  const allowed = process.env.NEXT_PUBLIC_SITE_URL
  if (!allowed) return true
  try {
    return new URL(origin).host === new URL(allowed).host
  } catch {
    return false
  }
}

export const badRequest = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status })

/**
 * Never leak internal errors to the client. Log the real thing server-side,
 * return something a parent can actually act on.
 */
export function serverError(scope: string, err: unknown) {
  console.error(`[${scope}]`, err)
  return NextResponse.json(
    { error: 'Something went wrong on our end. Please try again shortly.' },
    { status: 500 }
  )
}
