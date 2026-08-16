'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'
import { newsletterSchema } from '@/lib/schemas'
import { Field } from '@/components/form-fields'

export function NewsletterForm() {
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    const parsed = newsletterSchema.safeParse({
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      childYear: String(form.get('childYear') ?? ''),
      company: String(form.get('company') ?? ''),
    })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please check the form.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error ?? 'Something went wrong.')

      toast.success(
        'Almost there! Check your email to confirm your subscription — look out for a note from Ms Betty.'
      )
      formEl.reset()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 md:p-8">
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />
      <div className="flex items-center gap-3">
        <span className="tile h-11 w-11 bg-coral text-white shadow-xs">
          <Mail className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <div className="font-display text-2xl font-semibold text-ink">Sign up</div>
          <div className="text-xs text-ink-muted">
            Free, no spam, unsubscribe any time.
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <Field label="Your name" name="name" required autoComplete="name" />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field
          label="Child's year group (optional)"
          name="childYear"
          placeholder="e.g. Year 3"
        />
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Signing you up…' : 'Send me the newsletter'}
        </button>
      </div>
    </form>
  )
}
