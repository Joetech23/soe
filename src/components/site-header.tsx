'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Menu, X, ChevronDown, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { site, primaryNav, mobileNav } from '@/lib/site'
import { Icon } from '@/components/icon'
import { BasketBadge } from '@/components/add-to-basket'
import { LogoMark } from '@/components/logo'

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={site.name}>
      <LogoMark size={48} priority />
      <span className="hidden leading-tight sm:block">
        <span className="block font-display text-lg font-bold text-ink">
          {site.shortName}
        </span>
        <span className="block text-[0.7rem] text-ink-muted">{site.tagline}</span>
      </span>
    </Link>
  )
}

function Dropdown({
  label,
  children,
  pathname,
}: {
  label: string
  children: { href: string; label: string; desc: string; icon: string }[]
  pathname: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number>()

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const activeChild = children.some((c) => c.href === pathname)

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => {
        window.clearTimeout(closeTimer.current)
        setOpen(true)
      }}
      onMouseLeave={() => {
        closeTimer.current = window.setTimeout(() => setOpen(false), 120)
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          'flex items-center gap-1 rounded-pill px-3 py-2 text-sm font-semibold transition-colors',
          activeChild
            ? 'text-teal-deep'
            : 'text-ink-soft hover:bg-teal-tint hover:text-teal-deep'
        )}
      >
        {label}
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 pt-2">
          <div className="w-72 animate-scale-in rounded-card border border-line bg-surface p-2 shadow-lift">
            {children.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-start gap-3 rounded-xl p-2.5 transition-colors',
                  pathname === c.href ? 'bg-teal-tint' : 'hover:bg-surface-sunk'
                )}
              >
                <span className="tile h-9 w-9 shrink-0 bg-teal-tint text-teal">
                  <Icon name={c.icon} className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{c.label}</span>
                  <span className="block text-xs text-ink-muted">{c.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-shell items-center justify-between gap-4 px-4 py-3 md:px-8">
        <Logo />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {primaryNav.map((item) =>
            item.children ? (
              <Dropdown
                key={item.label}
                label={item.label}
                children={item.children}
                pathname={pathname}
              />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                className={cn(
                  'rounded-pill px-3 py-2 text-sm font-semibold transition-colors',
                  pathname === item.href
                    ? 'text-teal-deep'
                    : 'text-ink-soft hover:bg-teal-tint hover:text-teal-deep'
                )}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/newsletter"
            className="hidden rounded-pill px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:text-teal-deep xl:inline-flex"
          >
            Newsletter
          </Link>
          <BasketBadge />
          <Link
            href="/account"
            aria-label="My account"
            title="My account"
            className="grid h-11 w-11 place-items-center rounded-2xl text-ink-soft transition-colors hover:bg-teal-tint hover:text-teal-deep"
          >
            <UserRound className="h-5 w-5" />
          </Link>
          <Link href="/bookings" className="btn-primary hidden px-4 py-2.5 sm:inline-flex">
            Book a session
          </Link>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-11 w-11 place-items-center rounded-2xl text-ink transition-colors hover:bg-teal-tint lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-surface lg:hidden">
          <nav className="mx-auto flex max-w-shell flex-col px-4 py-3" aria-label="Mobile">
            {mobileNav.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href ? 'page' : undefined}
                className={cn(
                  'rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  pathname === l.href
                    ? 'bg-teal-tint text-teal-deep'
                    : 'text-ink-soft hover:bg-surface-sunk'
                )}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/account"
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-surface-sunk"
            >
              My account
            </Link>
            <Link href="/bookings" className="btn-primary mt-3">
              Book a session
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
