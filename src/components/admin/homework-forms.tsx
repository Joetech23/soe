'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Upload, Trash2, Send } from 'lucide-react'
import {
  createHomework,
  deleteHomework,
  createFeedback,
  type ActionResult,
} from '@/app/admin/(dash)/homework/actions'

type Group = { id: string; name: string }
type Child = { id: string; name: string; year_group: string | null }

const field =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20'

function handle(res: ActionResult, form?: HTMLFormElement) {
  if (res.ok) {
    toast.success(res.message)
    form?.reset()
  } else {
    toast.error(res.message)
  }
}

export function HomeworkForm({
  groups,
  children,
}: {
  groups: Group[]
  children: Child[]
}) {
  const [pending, start] = useTransition()

  return (
    <form
      action={(fd) => start(async () => handle(await createHomework(fd)))}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">
            Whole group
          </span>
          <select name="groupId" defaultValue="" className={field}>
            <option value="">— Choose a group —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">
            …or one child
          </span>
          <select name="childId" defaultValue="" className={field}>
            <option value="">— Choose a child —</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.year_group ? ` (${c.year_group})` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="-mt-2 text-xs text-ink-muted">
        Pick one or the other. A group post appears for every child in that group.
      </p>

      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-ink">Title</span>
        <input
          name="title"
          required
          placeholder="Times tables — 6s and 7s"
          className={field}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-ink">
          Instructions <span className="font-normal text-ink-muted">(optional)</span>
        </span>
        <textarea
          name="description"
          rows={3}
          placeholder="Complete pages 2 and 3. Try the challenge question if you can!"
          className={field}
        />
      </label>

      {/* Optional, and addressed to the parent rather than the child — it is
          the answer to "what did you do today?" that a 7-year-old will not
          give. It goes into the notification email as well as the portal. */}
      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-ink">
          Lesson summary{' '}
          <span className="font-normal text-ink-muted">(optional, for parents)</span>
        </span>
        <textarea
          name="lessonSummary"
          rows={3}
          placeholder="Today we revised number bonds to 20 and started column addition. Leo was much quicker with his doubles."
          className={field}
        />
        <span className="mt-1 block text-xs text-ink-muted">
          Shown to parents in the portal and included in their email.
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">
            Due date <span className="font-normal text-ink-muted">(optional)</span>
          </span>
          <input name="dueDate" type="date" className={field} />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">
            Attachment <span className="font-normal text-ink-muted">(optional)</span>
          </span>
          <input
            type="file"
            name="file"
            className="w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-teal file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
          />
        </label>
      </div>

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Posting…
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" /> Post homework
          </>
        )}
      </button>
      <p className="text-xs text-ink-muted">
        Attachments are stored privately. Parents only ever get a 60-second signed
        link, and only for their own child.
      </p>
    </form>
  )
}

export function DeleteHomeworkButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Remove homework"
      onClick={() => start(async () => handle(await deleteHomework(id)))}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-coral-tint hover:text-coral"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  )
}

export function FeedbackForm({ children }: { children: Child[] }) {
  const [pending, start] = useTransition()
  return (
    <form
      action={(fd) => start(async () => handle(await createFeedback(fd)))}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">Child</span>
          <select name="childId" required defaultValue="" className={field}>
            <option value="" disabled>
              — Choose a child —
            </option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.year_group ? ` (${c.year_group})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">Lesson date</span>
          <input name="lessonDate" type="date" className={field} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-ink">Note for the parent</span>
        <textarea
          name="note"
          rows={5}
          required
          placeholder="Lovely focus today. She blended cvc words independently and was proud of it — worth praising at home."
          className={field}
        />
      </label>

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Send feedback
          </>
        )}
      </button>
    </form>
  )
}
