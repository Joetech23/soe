'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Mail, X, Sparkles, CalendarCheck, BookOpen, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { site, whatsappHref, mailHref } from '@/lib/site'

/**
 * Sticky contact cluster, bottom-right.
 *
 * The "chat" is deliberately a signposting panel rather than a live chat
 * widget: Ms Betty is one person and cannot staff a chat box, so promising an
 * instant reply would be a lie. It routes people to the fastest real answer —
 * WhatsApp, the booking form, the FAQ — and states her actual reply time.
 */
const QUICK_LINKS = [
  {
    href: '/bookings',
    icon: CalendarCheck,
    label: 'Book a session',
    desc: 'Pick a class or join the waiting list',
    tile: 'bg-tile-rose text-coral',
  },
  {
    href: '/resources',
    icon: BookOpen,
    label: 'Free resources',
    desc: 'Phonics, reading and parent guides',
    tile: 'bg-tile-sky text-teal',
  },
  {
    href: '/faq',
    icon: HelpCircle,
    label: 'Common questions',
    desc: 'Payment, lesson length, what to bring',
    tile: 'bg-tile-amber text-gold-deep',
  },
]

export function StickyContact() {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)

  // Hold the buttons back until the visitor has engaged a little, so they
  // don't cover the hero on first paint.
  useEffect(() => {
    const reveal = () => setShown(window.scrollY > 320)
    reveal()
    window.addEventListener('scroll', reveal, { passive: true })
    const t = window.setTimeout(() => setShown(true), 4000)
    return () => {
      window.removeEventListener('scroll', reveal)
      window.clearTimeout(t)
    }
  }, [])

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div
      className={cn(
        'fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 transition-all duration-500',
        shown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      )}
    >
      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Get in touch"
          className="w-[min(21rem,calc(100vw-2.5rem))] animate-scale-in overflow-hidden rounded-card border border-line bg-surface shadow-pop"
        >
          <div className="relative bg-teal px-5 py-4 text-white">
            <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-10" aria-hidden />
            <div className="relative flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/15">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-display text-base font-bold">Hello! How can I help?</p>
                <p className="mt-0.5 text-xs text-white/80">
                  {site.owner} replies within {site.contact.replyTime}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3">
            {QUICK_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-sunk"
              >
                <span className={`tile h-9 w-9 shrink-0 ${l.tile}`}>
                  <l.icon className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{l.label}</span>
                  <span className="block text-xs text-ink-muted">{l.desc}</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-pill bg-[#25D366] px-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
            </a>
            <a
              href={mailHref}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-pill border border-line bg-surface px-3 text-sm font-bold text-ink transition-colors hover:border-teal hover:text-teal-deep"
            >
              <Mail className="h-4 w-4" aria-hidden /> Email
            </a>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-2.5">
        {!open && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${site.owner} on ${site.contact.whatsappDisplay}`}
            className="group grid h-12 w-12 place-items-center rounded-full bg-[#25D366] text-white shadow-lift transition-transform hover:-translate-y-1"
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
            <span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-pill bg-ink px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
              WhatsApp {site.contact.whatsappDisplay}
            </span>
          </a>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close help' : 'Open help'}
          className="relative grid h-14 w-14 place-items-center rounded-full bg-coral text-white shadow-lift transition-transform hover:-translate-y-1"
        >
          {open ? (
            <X className="h-6 w-6" aria-hidden />
          ) : (
            <>
              <MessageCircle className="h-6 w-6" aria-hidden />
              <span
                className="absolute inset-0 animate-pulse-ring rounded-full bg-coral/40"
                aria-hidden
              />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
