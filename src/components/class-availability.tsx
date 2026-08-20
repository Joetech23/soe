'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Users, CheckCircle2, Hourglass, ChevronDown } from 'lucide-react'
import type { GroupSeats } from '@/lib/groups'

const field =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20'

/**
 * Live class availability.
 *
 * Places left are counted from the register, so a class that fills up stops
 * offering itself the moment the last child is added. A full class does not
 * simply grey out — it opens the waiting-list form in place, because a parent
 * who has just found the right class is exactly the person worth capturing.
 */
export function ClassAvailability({ groups }: { groups: GroupSeats[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [joined, setJoined] = useState<Record<string, string>>({})

  // Only classes Ms Betty has actually capped are worth showing here; the rest
  // are covered by the normal booking form above.
  const capped = groups.filter((g) => g.capacity !== null && !g.isOneToOne)
  if (capped.length === 0) return null

  async function join(groupId: string, form: HTMLFormElement) {
    const fd = new FormData(form)
    setBusy(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          parentName: fd.get('parentName'),
          email: fd.get('email'),
          phone: fd.get('phone'),
          childName: fd.get('childName'),
          notes: fd.get('notes'),
          website: fd.get('website'),
        }),
      })
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string; position?: number | null; error?: string }
        | null

      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? json?.message ?? 'Could not add you to the list.')
        return
      }
      setJoined((j) => ({
        ...j,
        [groupId]: json.position
          ? `You are number ${json.position} on the list.`
          : 'You are on the list.',
      }))
      setOpenId(null)
      toast.success(json.message ?? 'Added to the waiting list.')
    } catch {
      toast.error('Could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {capped.map((g) => {
        const isOpen = openId === g.id
        const done = joined[g.id]

        return (
          <div
            key={g.id}
            className={`rounded-2xl border bg-surface transition-colors ${
              g.full ? 'border-line' : 'border-teal/30'
            }`}
          >
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <span
                className={`tile h-9 w-9 shrink-0 ${
                  g.full ? 'bg-tile-amber text-gold-deep' : 'bg-tile-mint text-success'
                }`}
              >
                {g.full ? (
                  <Hourglass className="h-4 w-4" aria-hidden />
                ) : (
                  <Users className="h-4 w-4" aria-hidden />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink">{g.name}</div>
                <div className="text-xs text-ink-muted">
                  {g.full
                    ? `Full — ${g.taken} of ${g.capacity} places taken`
                    : `${g.seatsLeft} of ${g.capacity} places left`}
                </div>
              </div>

              {done ? (
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-success-tint px-3 py-1.5 text-xs font-bold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {done}
                </span>
              ) : g.full ? (
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : g.id)}
                  aria-expanded={isOpen}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-pill border border-line px-4 text-xs font-bold text-ink transition-colors hover:border-coral hover:text-coral"
                >
                  Join the waiting list
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              ) : (
                <a
                  href="#booking-form"
                  className="inline-flex min-h-[38px] items-center rounded-pill bg-teal px-4 text-xs font-bold text-white transition-colors hover:bg-teal-deep"
                >
                  Book this class
                </a>
              )}
            </div>

            {isOpen && !done && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  join(g.id, e.currentTarget)
                }}
                className="space-y-3 border-t border-line px-5 py-4"
              >
                <p className="text-xs text-ink-muted">
                  Ms Betty will contact you as soon as a place opens up. No
                  payment, no obligation.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="parentName"
                    required
                    placeholder="Your name"
                    aria-label="Your name"
                    className={field}
                  />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="Your email"
                    aria-label="Your email"
                    className={field}
                  />
                  <input
                    name="childName"
                    placeholder="Child's first name (optional)"
                    aria-label="Child's first name"
                    className={field}
                  />
                  <input
                    name="phone"
                    type="tel"
                    placeholder="Phone (optional)"
                    aria-label="Phone"
                    className={field}
                  />
                </div>
                <div className="absolute left-[-9999px]" aria-hidden>
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </div>
                <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto">
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Adding you…
                    </>
                  ) : (
                    <>
                      <Hourglass className="h-4 w-4" /> Add me to the list
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )
      })}
    </div>
  )
}
