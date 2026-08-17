'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, AlertTriangle, ExternalLink } from 'lucide-react'
import {
  setVerificationMode,
  setAllowRegistration,
  setNotifyHomework,
  setNotifyFeedback,
  setNotifyOwnerSale,
  toggleSocialProvider,
  saveAnnouncement,
  type ActionResult,
} from '@/app/admin/(dash)/settings/actions'
import type { SocialProvider, VerificationMode } from '@/lib/settings'

/* -------------------------------------------------------------------------- */
/*  Switch                                                                    */
/* -------------------------------------------------------------------------- */
/**
 * A switch that flips immediately and rolls back if the server refuses.
 *
 * `useOptimistic` rather than local state because the truth still comes from
 * the server action — a failed save has to snap the switch back rather than
 * leave the UI claiming something that isn't so.
 */
export function Switch({
  label,
  hint,
  checked,
  disabled,
  action,
  tone = 'teal',
}: {
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  action: (on: boolean) => Promise<ActionResult>
  tone?: 'teal' | 'coral'
}) {
  const [pending, start] = useTransition()
  const [shown, setShown] = useOptimistic(checked)

  const on = shown
  const onColour = tone === 'coral' ? 'bg-coral' : 'bg-teal'

  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink">{label}</div>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{hint}</p>}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            setShown(!on)
            const res = await action(!on)
            res.ok ? toast.success(res.message) : toast.error(res.message)
          })
        }
        className={[
          'relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:ring-offset-2',
          on ? onColour : 'bg-line',
          disabled ? 'cursor-not-allowed opacity-50' : '',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-1 grid h-5 w-5 place-items-center rounded-full bg-white shadow-sm transition-all duration-200',
            on ? 'left-6' : 'left-1',
          ].join(' ')}
        >
          {pending && <Loader2 className="h-3 w-3 animate-spin text-ink-muted" />}
        </span>
      </button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  First-login verification                                                  */
/* -------------------------------------------------------------------------- */
const MODES: {
  value: VerificationMode
  title: string
  blurb: string
  risky?: boolean
}[] = [
  {
    value: 'code',
    title: 'Enter a code',
    blurb:
      'A parent types an 8-digit code from your branded email. They stay on your site the whole way through. Recommended.',
  },
  {
    value: 'link',
    title: 'Click a link',
    blurb:
      'A parent taps a button in your branded email instead. Fewer digits to copy, but it means leaving the page and coming back.',
  },
  {
    value: 'off',
    title: 'No check at all',
    blurb:
      'Accounts work the moment they are created. Fast, but a mistyped address gets a working account that can never receive homework emails.',
    risky: true,
  },
]

export function VerificationPicker({ current }: { current: VerificationMode }) {
  const [pending, start] = useTransition()
  const [shown, setShown] = useOptimistic(current)

  return (
    <div className="space-y-2.5 p-5">
      {MODES.map((m) => {
        const active = shown === m.value
        return (
          <button
            key={m.value}
            type="button"
            disabled={pending}
            aria-pressed={active}
            onClick={() =>
              start(async () => {
                if (m.value === shown) return
                setShown(m.value)
                const res = await setVerificationMode(m.value)
                res.ok ? toast.success(res.message) : toast.error(res.message)
              })
            }
            className={[
              'w-full rounded-2xl border p-4 text-left transition-all disabled:opacity-70',
              active
                ? 'border-teal bg-teal-tint/50 ring-1 ring-teal/30'
                : 'border-line bg-surface hover:border-ink/20',
            ].join(' ')}
          >
            <span className="flex items-start gap-3">
              <span
                className={[
                  'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors',
                  active ? 'border-teal' : 'border-line',
                ].join(' ')}
              >
                {active && <span className="h-2.5 w-2.5 rounded-full bg-teal" />}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-bold text-ink">
                  {m.title}
                  {m.risky && (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-tile-amber px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-gold-deep">
                      <AlertTriangle className="h-2.5 w-2.5" /> Least safe
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                  {m.blurb}
                </span>
              </span>
            </span>
          </button>
        )
      })}
      <p className="pt-1 text-xs text-ink-muted">
        This only ever happens once per parent. Every sign-in after it is just
        their email and password.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Social providers                                                          */
/* -------------------------------------------------------------------------- */
export function SocialToggles({
  chosen,
  available,
}: {
  chosen: SocialProvider[]
  available: SocialProvider[]
}) {
  const all: SocialProvider[] = ['google', 'facebook']
  const label = { google: 'Google', facebook: 'Facebook' } as const

  return (
    <div className="divide-y divide-line">
      {all.map((p) => {
        const configured = available.includes(p)
        return (
          <Switch
            key={p}
            label={`Continue with ${label[p]}`}
            hint={
              configured
                ? `Shows a ${label[p]} button on sign-in and sign-up. These accounts skip the email check — ${label[p]} has already proved the address.`
                : `Not enabled in Supabase yet. Turn it on under Authentication → Providers → ${label[p]}, then this switch will work.`
            }
            checked={chosen.includes(p)}
            disabled={!configured}
            action={(on) => toggleSocialProvider(p, on, chosen)}
          />
        )
      })}
      {available.length === 0 && (
        <div className="flex items-start gap-2.5 bg-tile-sky/50 px-5 py-4 text-xs text-ink-soft">
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" aria-hidden />
          <span>
            No social providers are configured on the Supabase project yet, so
            both switches are disabled. Enabling one takes a Google or Facebook
            app ID and secret pasted into the Supabase dashboard — nothing to
            change here in the code.
          </span>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Announcement bar                                                          */
/* -------------------------------------------------------------------------- */
export function AnnouncementForm({
  enabled,
  text,
}: {
  enabled: boolean
  text: string
}) {
  const [pending, start] = useTransition()
  const [value, setValue] = useState(text)
  const [on, setOn] = useState(enabled)

  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await saveAnnouncement(fd)
          res.ok ? toast.success(res.message) : toast.error(res.message)
        })
      }
      className="space-y-4 p-5"
    >
      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-ink">Message</span>
        <input
          name="text"
          value={value}
          maxLength={200}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Autumn term places are open — book by 30 September."
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
        />
        <span className="mt-1 block text-xs text-ink-muted">
          {value.length}/200 · shows as a bar across the top of every page.
        </span>
      </label>

      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name="enabled"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="h-4 w-4 rounded border-line text-coral focus:ring-coral/40"
        />
        Show it on the site
      </label>

      {on && value.trim().length > 2 && (
        <div className="rounded-xl border border-line bg-surface-sunk p-3">
          <div className="mb-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-ink-muted">
            Preview
          </div>
          <div className="rounded-lg bg-ink px-4 py-2.5 text-center text-xs font-semibold text-white">
            {value}
          </div>
        </div>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </>
        ) : (
          <>
            <Save className="h-4 w-4" /> Save announcement
          </>
        )}
      </button>
    </form>
  )
}

/* Thin wrappers so the page can stay a server component. */
export const RegistrationSwitch = ({ checked }: { checked: boolean }) => (
  <Switch
    label="Allow new accounts"
    hint="When off, the sign-up page explains that new accounts are paused and points people at your contact form. Existing parents can still sign in."
    checked={checked}
    action={setAllowRegistration}
  />
)

export const HomeworkSwitch = ({ checked }: { checked: boolean }) => (
  <Switch
    label="Email parents when I post homework"
    hint="Sends a branded email to every parent linked to that child or group."
    checked={checked}
    action={setNotifyHomework}
  />
)

export const FeedbackSwitch = ({ checked }: { checked: boolean }) => (
  <Switch
    label="Email parents when I post lesson feedback"
    hint="Same, for lesson notes and feedback."
    checked={checked}
    action={setNotifyFeedback}
  />
)

export const OwnerSaleSwitch = ({ checked }: { checked: boolean }) => (
  <Switch
    label="Email me when something sells"
    hint="A short summary of the order, sent to your own inbox."
    checked={checked}
    action={setNotifyOwnerSale}
  />
)
