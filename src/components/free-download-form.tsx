'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Download, Loader2 } from 'lucide-react'
import { freeDownloadSchema } from '@/lib/schemas'

/**
 * Email-gated free download.
 *
 * The newsletter checkbox is unticked and the download does NOT depend on it —
 * under UK GDPR/PECR consent cannot be bundled with obtaining a service.
 */
export function FreeDownloadForm({
  productSlug,
  productName,
}: {
  productSlug: string
  productName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const parsed = freeDownloadSchema.safeParse({
      email: String(form.get('email') ?? ''),
      name: String(form.get('name') ?? ''),
      productSlug,
      marketingConsent: form.get('marketingConsent') === 'on',
      company: String(form.get('company') ?? ''),
    })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please check the form.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/free-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error ?? 'Something went wrong.')

      toast.success(
        body.alreadyOwned
          ? "You already have this — here's a fresh link."
          : `Sent! Check your inbox for ${productName}.`
      )
      if (body.downloadUrl) router.push(body.downloadUrl)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        <Download className="h-4 w-4" /> Get it free
      </button>
    )
  }

  return (
    <form onSubmit={onSubmit} className="card animate-scale-in space-y-4 p-5">
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />
      <div>
        <div className="font-display text-lg font-bold text-ink">
          Where shall I send it?
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          You&rsquo;ll get the download straight away, plus a copy by email.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">
            Your name <span className="font-normal text-ink-muted">(optional)</span>
          </span>
          <input
            name="name"
            autoComplete="name"
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">
            Email <span className="text-coral">*</span>
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
          />
        </label>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-ink-soft">
        <input
          type="checkbox"
          name="marketingConsent"
          className="mt-0.5 h-4 w-4 rounded border-line text-coral focus:ring-coral/40"
        />
        <span>
          Also send me Ms Betty&rsquo;s occasional newsletter — learning tips and
          free resources. Optional, and you can unsubscribe any time.
        </span>
      </label>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Download className="h-4 w-4" /> Send my download
          </>
        )}
      </button>
    </form>
  )
}
