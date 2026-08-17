'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, Loader2, Inbox, ShoppingBag, Mail, GraduationCap } from 'lucide-react'
import { getNotifications, type Notification } from '@/app/admin/(dash)/shell-actions'

const ICONS = {
  enquiry: { icon: Inbox, tile: 'bg-tile-rose text-coral' },
  order: { icon: ShoppingBag, tile: 'bg-tile-mint text-success' },
  subscriber: { icon: Mail, tile: 'bg-tile-amber text-gold-deep' },
  parent: { icon: GraduationCap, tile: 'bg-tile-sky text-teal' },
} as const

function ago(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

/**
 * The notification bell.
 *
 * The badge count is rendered by the server so it is right on first paint; the
 * list itself is only fetched when the bell is opened, since most page loads
 * never open it.
 */
export function AdminNotifications({ initialCount }: { initialCount: number }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[] | null>(null)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && items === null) {
      setBusy(true)
      try {
        setItems(await getNotifications())
      } catch {
        setItems([])
      } finally {
        setBusy(false)
      }
    }
  }

  const count = items?.length ?? initialCount

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={count > 0 ? `Notifications (${count} new)` : 'Notifications'}
        aria-expanded={open}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-surface-sunk"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-[1.15rem] place-items-center rounded-full bg-coral px-1 text-[0.62rem] font-bold leading-[1.15rem] text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-bold text-ink">Recent activity</span>
            {count > 0 && (
              <span className="rounded-pill bg-coral-tint px-2 py-0.5 text-[0.65rem] font-bold text-coral-deep">
                {count} new
              </span>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {busy ? (
              <p className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </p>
            ) : !items || items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <span className="tile mx-auto mb-3 h-10 w-10 bg-surface-sunk text-ink-muted">
                  <Bell className="h-5 w-5" aria-hidden />
                </span>
                <p className="text-sm text-ink-soft">Nothing new right now.</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Enquiries, sales and new parents show up here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((n) => {
                  const cfg = ICONS[n.kind]
                  return (
                    <li key={n.id}>
                      <Link
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-sunk"
                      >
                        <span className={`tile h-8 w-8 shrink-0 ${cfg.tile}`}>
                          <cfg.icon className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink">
                            {n.title}
                          </span>
                          <span className="block truncate text-xs text-ink-muted">
                            {n.detail}
                          </span>
                        </span>
                        <span className="shrink-0 text-[0.65rem] text-ink-muted">
                          {ago(n.at)}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-line bg-surface-sunk px-4 py-2.5 text-center">
            <Link
              href="/admin/enquiries"
              onClick={() => setOpen(false)}
              className="text-xs font-bold text-teal hover:text-coral"
            >
              Go to enquiries
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
