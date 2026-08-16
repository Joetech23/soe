'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarCheck, Hourglass } from 'lucide-react'
import { bookingRequestSchema } from '@/lib/schemas'
import { BOOKING_YEAR_GROUPS, BOOKING_TERMS } from '@/lib/site'
import { CLASS_OPTIONS } from '@/lib/classes'
import { Field, Select, TextArea } from '@/components/form-fields'

function IntentButton({
  active,
  onClick,
  icon,
  label,
  helper,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  helper: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
        active
          ? 'border-coral bg-coral-tint'
          : 'border-line bg-surface hover:border-coral/50'
      }`}
    >
      <span
        className={`mt-0.5 grid h-8 w-8 place-items-center rounded-full ${
          active ? 'bg-coral text-white' : 'bg-surface-sunk text-ink'
        }`}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-bold text-ink">{label}</span>
        <span className="block text-xs text-ink-muted">{helper}</span>
      </span>
    </button>
  )
}

export function BookingForm() {
  const [intent, setIntent] = useState<'book' | 'waitlist'>('book')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    const data = {
      parentName: String(form.get('parentName') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      childName: String(form.get('childName') ?? ''),
      yearGroup: String(form.get('yearGroup') ?? ''),
      subject: String(form.get('subject') ?? ''),
      intent,
      notes: String(form.get('notes') ?? ''),
      agreeTerms: form.get('agreeTerms') === 'on',
      company: String(form.get('company') ?? ''),
    }

    const parsed = bookingRequestSchema.safeParse(data)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please check the form.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error ?? 'Something went wrong.')

      toast.success(
        intent === 'book'
          ? 'Booking request sent! Ms Betty will be in touch within 48 hours with next steps and payment details.'
          : "You're on the waiting list, Ms Betty will email you as soon as a slot opens up."
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
    <form
      onSubmit={handleSubmit}
      className="card space-y-6 p-6 md:p-8"
    >
      {/* honeypot */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-ink">
          I would like to&hellip;
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <IntentButton
            active={intent === 'book'}
            onClick={() => setIntent('book')}
            icon={<CalendarCheck className="h-4 w-4" />}
            label="Book a session"
            helper="Request a slot & pay"
          />
          <IntentButton
            active={intent === 'waitlist'}
            onClick={() => setIntent('waitlist')}
            icon={<Hourglass className="h-4 w-4" />}
            label="Join waiting list"
            helper="I'll email when free"
          />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="parentName" required autoComplete="name" />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" />
        <Field label="Child's first name" name="childName" required />
        <Select label="Year group" name="yearGroup" options={BOOKING_YEAR_GROUPS} required />
      </div>

      <Select
        label="Which class would you like?"
        name="subject"
        options={CLASS_OPTIONS}
        required
      />
      <p className="-mt-3 text-xs text-ink-muted">
        All sessions run on Zoom. Times shown are UK (GMT/BST). Not sure which
        fits? Pick &ldquo;Not sure yet&rdquo; and Ms Betty will advise.
      </p>

      <TextArea
        label="Anything Ms Betty should know?"
        name="notes"
        placeholder="Learning strengths, worries, targets, SEN needs, whatever helps."
      />

      <div className="rounded-2xl border border-line bg-surface-sunk/60 p-4 text-sm">
        <div className="font-display text-base font-semibold text-ink">
          Terms &amp; conditions
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
          {BOOKING_TERMS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <label className="mt-3 flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="agreeTerms"
            required
            className="mt-1 h-4 w-4 rounded border-line text-coral focus:ring-coral/40"
          />
          <span>I&rsquo;ve read and agree to the terms and conditions above.</span>
        </label>
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting
          ? 'Sending…'
          : intent === 'book'
            ? 'Send booking request'
            : 'Join the waiting list'}
      </button>
    </form>
  )
}
