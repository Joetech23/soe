'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import {
  createCategory,
  deleteCategory,
  type ActionResult,
} from '@/app/admin/(dash)/categories/actions'

const field =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20'

/** Returns void explicitly — startTransition rejects a non-void callback. */
function handle(res: ActionResult, form?: HTMLFormElement): void {
  if (res.ok) {
    toast.success(res.message)
    form?.reset()
  } else {
    toast.error(res.message)
  }
}

export function CategoryForm() {
  const [pending, start] = useTransition()
  return (
    <form
      id="category-form"
      action={(fd) =>
        start(async () => {
          const el = document.getElementById('category-form') as HTMLFormElement | null
          handle(await createCategory(fd), el ?? undefined)
        })
      }
      className="space-y-4"
    >
      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-ink">
          Name <span className="text-coral">*</span>
        </span>
        <input name="name" required placeholder="Handwriting" className={field} />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-ink">
          Web address{' '}
          <span className="font-normal text-ink-muted">(leave blank to generate)</span>
        </span>
        <input name="slug" placeholder="handwriting" className={field} />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-ink">
          Summary <span className="font-normal text-ink-muted">(optional)</span>
        </span>
        <input name="summary" placeholder="Letter formation and pencil grip" className={field} />
      </label>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Creating…
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" /> Add category
          </>
        )}
      </button>
    </form>
  )
}

export function DeleteCategoryButton({
  id,
  name,
  inUse,
}: {
  id: string
  name: string
  inUse: boolean
}) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Remove ${name}`}
      title={
        inUse
          ? 'Move its resources elsewhere first'
          : `Remove ${name}`
      }
      onClick={() => start(async () => handle(await deleteCategory(id)))}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-coral-tint hover:text-coral disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  )
}
