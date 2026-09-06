'use client'

import { useEffect, useState } from 'react'
import {
  Sparkles,
  X,
  Banknote,
  PencilLine,
  Users,
  Link2,
  Mail,
  ArrowRight,
} from 'lucide-react'

/**
 * The one-time "what's new" note.
 *
 * Bump RELEASE whenever there's a new batch to announce. It shows once per
 * browser — the seen flag is keyed by that string in localStorage — so the
 * next release re-opens it, and re-reading these same notes never does.
 *
 * localStorage, not the database, on purpose: "have I read the changelog" is a
 * per-device convenience, not shared state, and it must degrade to simply
 * showing the note if storage is blocked (private windows, cleared data) rather
 * than throwing. It renders nothing on the server and waits for mount, so it
 * cannot flash for a reader who has already dismissed it.
 */
const RELEASE = '2026-09-06'
const KEY = `soe.whatsnew.${RELEASE}`

type Item = {
  icon: typeof Banknote
  tile: string
  title: string
  body: string
}

const ITEMS: Item[] = [
  {
    icon: Banknote,
    tile: 'bg-tile-mint text-success',
    title: 'Revenue now counts tuition',
    body: 'Paid invoices are added to “Revenue this month” on the dashboard and Reports, with a shop-vs-tuition breakdown — it no longer reads £0 when the money came from lessons.',
  },
  {
    icon: PencilLine,
    tile: 'bg-tile-sky text-teal',
    title: 'Edit a group any time',
    body: 'Groups have a pencil now — rename them when the slot moves (“Wednesday 4pm — Year 1”), and adjust the notes, class-size limit and 1:1 flag in the same place.',
  },
  {
    icon: Users,
    tile: 'bg-tile-violet text-ink-soft',
    title: 'One code for a whole family',
    body: 'A parent with brothers or sisters gets a single invite code that links all of their children at once — tick the siblings under “One code for a family” on the Children page.',
  },
  {
    icon: Link2,
    tile: 'bg-tile-amber text-gold-deep',
    title: 'Send a join link, not just a code',
    body: 'Next to every code there’s a “Copy link” button. It opens sign-up with the code already filled in, so parents don’t have to type it.',
  },
  {
    icon: Mail,
    tile: 'bg-tile-rose text-coral',
    title: 'Enquiries you can act on',
    body: 'Every enquiry opens a full detail view where you can raise an invoice for the class the parent picked, and choose how they pay — bank transfer, Stripe or PayPal.',
  },
]

export function WhatsNew() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true)
    } catch {
      // Storage blocked — show it this once rather than suppress it silently.
      setOpen(true)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function dismiss() {
    try {
      localStorage.setItem(KEY, new Date().toISOString())
    } catch {
      /* nothing to do — it simply shows again next time */
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsnew-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss()
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-card border border-line bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line bg-surface-sunk/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="tile h-10 w-10 bg-coral text-white">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 id="whatsnew-title" className="font-display text-lg font-bold text-ink">
                What&rsquo;s new
              </h2>
              <p className="text-xs text-ink-muted">A few upgrades since you were last here.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-surface-sunk hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
          {ITEMS.map((it) => (
            <li key={it.title} className="flex gap-3.5 px-6 py-4">
              <span className={`tile h-9 w-9 shrink-0 ${it.tile}`}>
                <it.icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <div>
                <div className="font-semibold text-ink">{it.title}</div>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{it.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
          <button type="button" onClick={dismiss} className="btn-primary">
            Got it <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
