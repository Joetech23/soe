'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminNav } from '@/lib/admin/nav'
import { AdminIcon } from './admin-icon'
import { LogoMark } from '@/components/logo'

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

export function AdminSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile scrim */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-surface transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <LogoMark size={40} />
            <span className="leading-tight">
              <span className="block font-display text-base font-semibold text-ink">
                Spirit of Excellence
              </span>
              <span className="block text-[0.68rem] text-ink-muted">Admin console</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-ink-muted hover:bg-surface-sunk lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {adminNav.map((group) => (
            <div key={group.group} className="mt-5 first:mt-2">
              <div className="px-3 pb-1.5 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-ink-muted">
                {group.group}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                          active
                            ? 'bg-teal-tint text-teal-deep'
                            : 'text-ink-soft hover:bg-surface-sunk'
                        )}
                      >
                        <AdminIcon
                          name={item.icon}
                          className={cn('h-[1.15rem] w-[1.15rem]', active ? 'text-teal' : 'text-ink-muted')}
                        />
                        {item.label}
                        {item.badge ? (
                          <span className="ml-auto rounded-pill bg-coral px-1.5 py-0.5 text-[0.66rem] font-bold text-white">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-surface-sunk"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-sunk text-ink-muted">
              ←
            </span>
            Back to site
          </Link>
        </div>
      </aside>
    </>
  )
}
