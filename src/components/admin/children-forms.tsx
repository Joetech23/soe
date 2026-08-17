'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Copy, Trash2, Ticket, Check } from 'lucide-react'
import {
  createChild,
  createGroup,
  deleteChild,
  deleteGroup,
  issueInviteCode,
  assignChildGroup,
  type ActionResult,
} from '@/app/admin/(dash)/children/actions'

type Group = { id: string; name: string; is_one_to_one: boolean }

const field =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20'

/** Returns void explicitly — startTransition rejects a non-void callback. */
function handle(res: ActionResult, form?: HTMLFormElement): void {
  if (!res.ok) {
    toast.error(res.message)
    return
  }
  if (res.code) {
    toast.success(`${res.message} Invite code: ${res.code}`, { duration: 8000 })
  } else {
    toast.success(res.message)
  }
  form?.reset()
}

/* ------------------------------- Add a child ------------------------------- */
export function ChildForm({ groups }: { groups: Group[] }) {
  const [pending, start] = useTransition()
  return (
    <form
      action={(fd) =>
        start(async () => {
          const el = document.getElementById('child-form') as HTMLFormElement | null
          handle(await createChild(fd), el ?? undefined)
        })
      }
      id="child-form"
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">
            First name <span className="text-coral">*</span>
          </span>
          <input name="name" required placeholder="Leo" className={field} />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">Year group</span>
          <select name="yearGroup" defaultValue="" className={field}>
            <option value="">— Not set —</option>
            {['Reception', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'].map(
              (y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            )}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-ink">Group</span>
        <select name="groupId" defaultValue="" className={field}>
          <option value="">— Unassigned —</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
              {g.is_one_to_one ? ' (1:1)' : ''}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Adding…
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" /> Add child &amp; create code
          </>
        )}
      </button>
      <p className="text-xs text-ink-muted">
        An invite code is generated automatically. Send it to the parent — it links
        them to this child and nothing else.
      </p>
    </form>
  )
}

/* ------------------------------- Add a group ------------------------------- */
export function GroupForm() {
  const [pending, start] = useTransition()
  return (
    <form
      action={(fd) =>
        start(async () => {
          const el = document.getElementById('group-form') as HTMLFormElement | null
          handle(await createGroup(fd), el ?? undefined)
        })
      }
      id="group-form"
      className="space-y-4"
    >
      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-ink">
          Group name <span className="text-coral">*</span>
        </span>
        <input
          name="name"
          required
          placeholder="Wednesday 4pm — Year 1 Maths &amp; English"
          className={field}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-ink">
          Notes <span className="font-normal text-ink-muted">(optional)</span>
        </span>
        <input name="description" placeholder="Zoom link in the calendar invite" className={field} />
      </label>
      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name="isOneToOne"
          className="h-4 w-4 rounded border-line text-coral focus:ring-coral/40"
        />
        This is a one-to-one slot
      </label>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Creating…
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" /> Create group
          </>
        )}
      </button>
    </form>
  )
}

/* ------------------------------ Row actions ------------------------------- */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code)
          setCopied(true)
          toast.success('Code copied')
          setTimeout(() => setCopied(false), 1600)
        } catch {
          toast.error('Could not copy — select the code and copy manually.')
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg bg-surface-sunk px-2 py-1 font-mono text-xs font-bold text-ink transition-colors hover:bg-teal-tint hover:text-teal-deep"
      title="Copy invite code"
    >
      {code}
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

export function NewCodeButton({ childId, childName }: { childId: string; childName: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => handle(await issueInviteCode(childId, childName)))}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-teal hover:bg-teal-tint"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ticket className="h-3 w-3" />}
      New code
    </button>
  )
}

export function GroupPicker({
  childId,
  groups,
  current,
}: {
  childId: string
  groups: Group[]
  current: string | null
}) {
  const [pending, start] = useTransition()
  return (
    <select
      defaultValue={current ?? ''}
      disabled={pending}
      onChange={(e) =>
        start(async () =>
          handle(await assignChildGroup(childId, e.target.value || null))
        )
      }
      className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink focus:border-teal focus:outline-none"
      aria-label="Assign group"
    >
      <option value="">Unassigned</option>
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  )
}

export function DeleteChildButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => handle(await deleteChild(id)))}
          className="rounded-lg bg-coral px-2 py-1 text-xs font-bold text-white"
        >
          {pending ? '…' : 'Delete'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-ink-muted hover:bg-surface-sunk"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={`Remove ${name}`}
      title={`Remove ${name} and all their homework and feedback`}
      className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-coral-tint hover:text-coral"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

export function DeleteGroupButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Remove group"
      onClick={() => start(async () => handle(await deleteGroup(id)))}
      className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-coral-tint hover:text-coral"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  )
}
