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

/** Absolute site origin, safe on server and client. */
export function siteUrl(path = ''): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3012'
  return path ? `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}` : base
}
