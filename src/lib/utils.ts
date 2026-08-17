import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Pence → "£12.00" (or "£12" when whole pounds, "Free" when zero). */
export function formatPrice(pence: number): string {
  if (pence === 0) return 'Free'
  const pounds = pence / 100
  return pounds % 1 === 0 ? `£${pounds}` : `£${pounds.toFixed(2)}`
}

/**
 * Money as money — always a £ figure, never the word "Free".
 *
 * Use for totals, revenue and takings. `formatPrice` is for a *product's*
 * price, where zero means "this costs nothing"; on a revenue line zero means
 * "we took nothing", and "Revenue this month: Free" is nonsense.
 */
export function formatMoney(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

/**
 * Absolute site origin, safe on server and client.
 *
 * Defensive on purpose: this feeds `new URL()` in the root layout's
 * `metadataBase`, and a malformed value there throws at module scope, which
 * Next reports only as the opaque "Failed to collect page data" — a build
 * failure that is very hard to trace back to one environment variable.
 *
 * So we tolerate the ways a domain actually gets pasted into a hosting
 * dashboard: a bare host ("soetuition.com"), a trailing slash, stray spaces,
 * or a protocol-relative "//host". Vercel's own VERCEL_URL is the fallback so
 * preview deployments resolve to themselves rather than localhost.
 */
export function siteUrl(path = ''): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3012'

  let base = raw.replace(/^\/\//, 'https://')
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`
  base = base.replace(/\/+$/, '')

  // Final guard: if it is still not parseable, fall back rather than throw.
  try {
    base = new URL(base).origin
  } catch {
    base = 'http://localhost:3012'
  }

  if (!path) return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
