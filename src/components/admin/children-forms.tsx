'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Copy, Trash2, Ticket, Check, Link2, Users } from 'lucide-react'
import {
  createChild,
  createGroup,
  deleteChild,
  deleteGroup,
  issueInviteCode,
  issueFamilyCode,
  linkChildToParent,
  assignChildGroup,
  type ActionResult,
} from '@/app/admin/(dash)/children/actions'

type Group = { id: string; name: string; is_one_to_one: boolean }
export type Parent = { id: string; email: string; childCount: number }

/**
 * The link a parent actually receives.
 *
 * Built from the live origin rather than an env var, so a code copied from a
 * preview deployment points at that deployment and one copied from the real
 * site points at the real site. Ms Betty pastes this straight into WhatsApp.
 */
function signupLink(code: string): string {
  const origin =
    typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}/account/register?code=${encodeURIComponent(code)}`
}

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
export function ChildForm({
  groups,
  parents = [],
}: {
  groups: Group[]
  parents?: Parent[]
}) {
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
      {/* First name and group only. The year group was a second thing to keep
          in step with the group name, which already says the year. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">
            First name <span className="text-coral">*</span>
          </span>
          <input name="name" required placeholder="Leo" className={field} />
        </label>
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
      </div>

      {/* The sibling case. Choosing a parent here skips codes altogether — the
          child simply appears in the portal that parent already signs into. */}
      {parents.length > 0 && (
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">
            Parent{' '}
            <span className="font-normal text-ink-muted">
              — already registered? Pick them and no code is needed
            </span>
          </span>
          <select name="parentUserId" defaultValue="" className={field}>
            <option value="">— New parent, create an invite code —</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.email} ({p.childCount} child{p.childCount === 1 ? '' : 'ren'})
              </option>
            ))}
          </select>
        </label>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Adding…
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" /> Add child
          </>
        )}
      </button>
      <p className="text-xs text-ink-muted">
        For a brand-new parent an invite code is generated automatically — send
        them the join link and it links every child on that code at once.
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
      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-ink">
          Class size limit{' '}
          <span className="font-normal text-ink-muted">(optional)</span>
        </span>
        <input
          name="capacity"
          type="number"
          min={1}
          max={100}
          placeholder="e.g. 8"
          className={field}
        />
        <span className="mt-1 block text-xs text-ink-muted">
          Once this many children are in the group, new bookings are offered the
          waiting list instead. Leave blank for no limit.
        </span>
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

/**
 * Copy the join link rather than the bare code.
 *
 * Sending a code alone leaves the parent to find the register page and type it
 * without transcription errors. The link opens registration with the code
 * already in the box, which removes both problems.
 */
export function CopyLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(signupLink(code))
          setCopied(true)
          toast.success('Join link copied — paste it to the parent.')
          setTimeout(() => setCopied(false), 1600)
        } catch {
          toast.error('Could not copy the link.')
        }
      }}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-teal hover:bg-teal-tint"
      title="Copy the sign-up link for this code"
    >
      {copied ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
      Copy link
    </button>
  )
}

/**
 * One code for several children.
 *
 * The parent types it once and every sibling on it appears in their portal
 * together — which is the whole reason this exists.
 */
export function FamilyCodeForm({
  children,
}: {
  children: { id: string; name: string }[]
}) {
  const [picked, setPicked] = useState<string[]>([])
  const [pending, start] = useTransition()

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  if (children.length < 2) {
    return (
      <p className="px-5 py-8 text-center text-sm text-ink-muted">
        You need at least two children waiting for a parent before a family code
        makes sense.
      </p>
    )
  }

  return (
    <div className="p-5">
      <p className="mb-4 text-sm text-ink-soft">
        Tick the brothers and sisters that belong to the same parent. They get one
        code, and all of them appear together.
      </p>

      <div className="flex flex-wrap gap-2">
        {children.map((c) => {
          const on = picked.includes(c.id)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              aria-pressed={on}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-pill border px-3 text-sm font-semibold transition-colors ${
                on
                  ? 'border-teal bg-teal text-white'
                  : 'border-line bg-surface text-ink hover:border-teal'
              }`}
            >
              {on && <Check className="h-3.5 w-3.5" aria-hidden />}
              {c.name}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        disabled={pending || picked.length < 2}
        onClick={() =>
          start(async () => {
            const res = await issueFamilyCode(picked)
            handle(res)
            if (res.ok) setPicked([])
          })
        }
        className="btn-primary mt-5 disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Creating…
          </>
        ) : (
          <>
            <Users className="h-4 w-4" /> Create one code for{' '}
            {picked.length || 'these'} children
          </>
        )}
      </button>
    </div>
  )
}

/**
 * Attach a child to a parent who already has an account.
 *
 * The shortest path for a sibling who starts later: no code, no second
 * registration, the child simply shows up in the portal the parent already uses.
 */
export function ParentPicker({
  childId,
  parents,
  current,
}: {
  childId: string
  parents: Parent[]
  current: string | null
}) {
  const [pending, start] = useTransition()
  if (parents.length === 0) return null
  return (
    <select
      defaultValue={current ?? ''}
      disabled={pending}
      onChange={(e) =>
        start(async () => handle(await linkChildToParent(childId, e.target.value || null)))
      }
      className="max-w-[13rem] truncate rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink focus:border-teal focus:outline-none"
      aria-label="Link to an existing parent"
    >
      <option value="">No parent linked</option>
      {parents.map((p) => (
        <option key={p.id} value={p.id}>
          {p.email}
        </option>
      ))}
    </select>
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
