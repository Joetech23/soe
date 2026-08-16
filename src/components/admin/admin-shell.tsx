'use client'

import { useState } from 'react'
import { Menu, Search, Bell, LogOut } from 'lucide-react'
import { AdminSidebar } from './admin-sidebar'

/**
 * Admin chrome: fixed sidebar + sticky topbar, content scrolls between them.
 * Client component so the mobile drawer can toggle; pages passed as children.
 */
export function AdminShell({
  children,
  ownerName = 'Ms Betty',
  ownerEmail = 'soetuition@gmail.com',
}: {
  children: React.ReactNode
  ownerName?: string
  ownerEmail?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-canvas">
      <AdminSidebar open={open} onClose={() => setOpen(false)} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="grid h-10 w-10 place-items-center rounded-xl text-ink hover:bg-surface-sunk lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <label className="relative hidden max-w-md flex-1 sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                placeholder="Search orders, products, customers…"
                className="w-full rounded-pill border border-line bg-surface py-2 pl-9 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
              />
            </label>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                aria-label="Notifications"
                className="relative grid h-10 w-10 place-items-center rounded-xl text-ink-soft hover:bg-surface-sunk"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-coral" />
              </button>
              <div className="flex items-center gap-2.5 rounded-pill border border-line bg-surface py-1 pl-1 pr-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-teal text-sm font-bold text-white">
                  {ownerName.charAt(0)}
                </span>
                <span className="hidden leading-tight sm:block">
                  <span className="block text-xs font-bold text-ink">{ownerName}</span>
                  <span className="block text-[0.68rem] text-ink-muted">{ownerEmail}</span>
                </span>
              </div>
              {/* POST so auth cookies are cleared server-side. */}
              <form action="/auth/signout?next=/admin/login" method="post">
                <button
                  type="submit"
                  title="Sign out"
                  aria-label="Sign out"
                  className="grid h-10 w-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-coral-tint hover:text-coral"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  )
}
