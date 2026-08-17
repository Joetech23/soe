'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Library, Receipt, GraduationCap, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/account', label: 'Overview', short: 'Home', icon: UserRound, exact: true },
  { href: '/account/library', label: 'My library', short: 'Library', icon: Library },
  { href: '/account/orders', label: 'Orders', short: 'Orders', icon: Receipt },
  { href: '/account/child', label: 'My child', short: 'Child', icon: GraduationCap },
]

/**
 * Account tabs.
 *
 * Mobile: a fixed bottom bar with icons above short labels — the pattern phone
 * users already know, and it keeps navigation in thumb reach instead of
 * pushing a cramped scrolling pill row off the top of the screen.
 * Desktop (sm+): the pill row.
 */
export function AccountNav() {
  const pathname = usePathname()
  const isActive = (l: (typeof LINKS)[number]) =>
    l.exact ? pathname === l.href : pathname.startsWith(l.href)

  return (
    <>
      {/* Desktop / tablet */}
      <nav
        className="hidden gap-1.5 rounded-pill border border-line bg-surface p-1.5 sm:flex"
        aria-label="Account"
      >
        {LINKS.map((l) => {
          const active = isActive(l)
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-2 rounded-pill px-4 py-2 text-sm font-semibold transition-colors',
                active
                  ? 'bg-teal text-white'
                  : 'text-ink-soft hover:bg-teal-tint hover:text-teal-deep'
              )}
            >
              <l.icon className="h-4 w-4" aria-hidden />
              {l.label}
            </Link>
          )
        })}
      </nav>

      {/* Mobile bottom bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        aria-label="Account"
      >
        <ul className="grid grid-cols-4">
          {LINKS.map((l) => {
            const active = isActive(l)
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 text-[0.68rem] font-bold transition-colors',
                    active ? 'text-teal-deep' : 'text-ink-muted'
                  )}
                >
                  <span
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-xl transition-colors',
                      active && 'bg-teal-tint'
                    )}
                  >
                    <l.icon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
                  </span>
                  {l.short}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
