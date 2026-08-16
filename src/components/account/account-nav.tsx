'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Library, Receipt, GraduationCap, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/account', label: 'Overview', icon: UserRound, exact: true },
  { href: '/account/library', label: 'My library', icon: Library },
  { href: '/account/orders', label: 'Orders', icon: Receipt },
  { href: '/account/child', label: "My child", icon: GraduationCap },
]

export function AccountNav() {
  const pathname = usePathname()
  return (
    <nav
      className="flex gap-1.5 overflow-x-auto rounded-pill border border-line bg-surface p-1.5"
      aria-label="Account"
    >
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-pill px-4 py-2 text-sm font-semibold transition-colors',
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
  )
}
