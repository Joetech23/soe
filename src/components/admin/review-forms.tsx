'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Check, X, Star, Trash2, Undo2 } from 'lucide-react'
import {
  setReviewStatus,
  setReviewFeatured,
  deleteReview,
  type ActionResult,
} from '@/app/admin/(dash)/reviews/actions'

function handle(res: ActionResult): void {
  if (res.ok) toast.success(res.message)
  else toast.error(res.message)
}

/**
 * Moderation controls for one review.
 *
 * "Hide" rather than delete is the default destructive action: a review Ms
 * Betty is unsure about should be recoverable, and deleting a parent's words
 * by accident is not something you can undo.
 */
export function ReviewActions({
  id,
  status,
  featured,
}: {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  featured: boolean
}) {
  const [busy, start] = useTransition()

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status !== 'approved' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => start(async () => handle(await setReviewStatus(id, 'approved')))}
          className="inline-flex items-center gap-1.5 rounded-pill bg-success px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          Publish
        </button>
      )}

      {status !== 'rejected' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => start(async () => handle(await setReviewStatus(id, 'rejected')))}
          className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-xs font-bold text-ink-soft transition-colors hover:border-coral hover:text-coral disabled:opacity-50"
        >
          <X className="h-3 w-3" /> Hide
        </button>
      )}

      {status !== 'pending' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => start(async () => handle(await setReviewStatus(id, 'pending')))}
          title="Move back to pending"
          className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-xs font-bold text-ink-muted hover:bg-surface-sunk disabled:opacity-50"
        >
          <Undo2 className="h-3 w-3" /> Undo
        </button>
      )}

      {status === 'approved' && (
        <button
          type="button"
          disabled={busy}
          aria-pressed={featured}
          onClick={() => start(async () => handle(await setReviewFeatured(id, !featured)))}
          title={featured ? 'Shown large at the top' : 'Show large at the top'}
          className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
            featured
              ? 'border-gold bg-gold-tint text-gold-deep'
              : 'border-line text-ink-soft hover:border-gold hover:text-gold-deep'
          }`}
        >
          <Star className={`h-3 w-3 ${featured ? 'fill-current' : ''}`} />
          {featured ? 'Featured' : 'Feature'}
        </button>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => start(async () => handle(await deleteReview(id)))}
        aria-label="Delete review permanently"
        title="Delete permanently"
        className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-ink-muted hover:bg-coral-tint hover:text-coral disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
