'use client'

import { Moon, Sun } from 'lucide-react'

export const THEME_COOKIE = 'soe-admin-theme'
export type Theme = 'light' | 'dark'

/**
 * Light/dark switch for the admin.
 *
 * The theme is owned by AdminShell's React state, not written onto the DOM
 * from here. Setting `data-theme` imperatively looks like it works and then
 * silently reverts: the shell re-renders on the next client-side navigation
 * and React puts the attribute back to whatever the server prop said.
 *
 * The initial value is server-rendered from a cookie, so the correct theme is
 * in the first paint — no flash, and no blocking inline script.
 */
export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: Theme
  onChange: (next: Theme) => void
}) {
  function flip() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    onChange(next)
    // A year. Lax is right: a display preference, never a credential.
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={flip}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="grid h-10 w-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-surface-sunk"
    >
      <span className="relative block h-5 w-5">
        <Sun
          className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
          aria-hidden
        />
        <Moon
          className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          }`}
          aria-hidden
        />
      </span>
    </button>
  )
}
