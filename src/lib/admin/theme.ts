/**
 * Admin theme constants.
 *
 * Deliberately its own module with no 'use client' and no React import: both
 * the server layout (which reads the cookie) and the client toggle (which
 * writes it) need these, and importing a plain constant out of a 'use client'
 * file into a server component does not reliably give you the value — the
 * module is a client boundary, so the server ends up with undefined and
 * silently falls back to the default. That produced a toggle that worked until
 * you reloaded.
 */
export const THEME_COOKIE = 'soe-admin-theme'

export type Theme = 'light' | 'dark'

export function parseTheme(value: string | undefined): Theme {
  return value === 'dark' ? 'dark' : 'light'
}
