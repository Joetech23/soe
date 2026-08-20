'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Star, PenLine, CheckCircle2 } from 'lucide-react'
import { submitReview } from '@/app/(site)/testimonials/review-actions'

const field =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20'

/**
 * Parent review form.
 *
 * Says plainly that a review is read before it appears — people are more
 * willing to write honestly when they know a human sees it first, and it sets
 * the expectation that it will not show up instantly.
 */
export function ReviewForm({ topics }: { topics: readonly string[] }) {
  const [pending, start] = useTransition()
  const [rating, setRating] = useState(5)
  const [hover, setHover] = useState(0)
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <div className="card p-8 text-center">
        <span className="tile mx-auto mb-4 h-12 w-12 bg-tile-mint text-success">
          <CheckCircle2 className="h-6 w-6" aria-hidden />
        </span>
        <h3 className="font-display text-xl font-bold text-ink">Thank you</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
          Ms Betty will read your review before it goes on the site. It means a
          great deal.
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="btn-secondary mt-6"
        >
          Write another
        </button>
      </div>
    )
  }

  return (
    <form
      action={(fd) =>
        start(async () => {
          fd.set('rating', String(rating))
          const res = await submitReview(fd)
          res.ok ? setDone(true) : toast.error(res.message)
        })
      }
      className="card space-y-4 p-6 sm:p-8"
    >
      <div>
        <h3 className="font-display text-xl font-bold text-ink">
          Share your experience
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          Every review is read by Ms Betty before it appears here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">Your name</span>
          <input
            name="authorName"
            required
            minLength={2}
            maxLength={60}
            placeholder="Sarah O."
            className={field}
          />
          <span className="mt-1 block text-xs text-ink-muted">
            First name and an initial is fine.
          </span>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">
            Year group <span className="font-normal text-ink-muted">(optional)</span>
          </span>
          <select name="topic" defaultValue="" className={field}>
            <option value="">— Not saying —</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-ink">
          Email <span className="font-normal text-ink-muted">(optional, never shown)</span>
        </span>
        <input name="authorEmail" type="email" placeholder="you@example.com" className={field} />
        <span className="mt-1 block text-xs text-ink-muted">
          Only so Ms Betty can thank you or check a detail.
        </span>
      </label>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold text-ink">Rating</legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              aria-pressed={rating === n}
              className="rounded p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  n <= (hover || rating)
                    ? 'fill-gold text-gold'
                    : 'fill-transparent text-line'
                }`}
                aria-hidden
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-ink-muted">{rating} of 5</span>
        </div>
      </fieldset>

      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-ink">Your review</span>
        <textarea
          name="quote"
          required
          minLength={20}
          maxLength={1500}
          rows={5}
          placeholder="What has changed for your child since starting with Ms Betty?"
          className={`${field} resize-y`}
        />
      </label>

      {/* Honeypot — hidden from people, irresistible to bots. */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <PenLine className="h-4 w-4" /> Send my review
          </>
        )}
      </button>
    </form>
  )
}
