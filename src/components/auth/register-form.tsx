'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, UserPlus, Ticket, MailCheck, ArrowLeft } from 'lucide-react'
import { startRegistration } from '@/app/account/auth-actions'
import { AuthSplit } from '@/components/auth-split'
import { SocialButtons, type SocialProvider } from '@/components/auth/social-buttons'
import { VerifyCodePanel } from '@/components/auth/verify-panel'

const field =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20'

export function RegisterForm({
  next,
  providers,
  allowRegistration,
}: {
  next: string
  providers: SocialProvider[]
  allowRegistration: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [step, setStep] = useState<'form' | 'code' | 'link'>('form')
  const [email, setEmail] = useState('')
  const [invite, setInvite] = useState('')
  const [showInvite, setShowInvite] = useState(false)

  if (!allowRegistration) {
    return (
      <AuthSplit
        title="Sign-ups are paused"
        subtitle="New accounts are closed at the moment."
      >
        <div className="card p-6 text-center">
          <p className="text-sm text-ink-soft">
            Ms Betty has paused new accounts for now. If you have lessons booked
            and need access to the parent portal, please get in touch and she
            will set you up.
          </p>
          <Link href="/contact" className="btn-primary mt-6 w-full">
            Contact Ms Betty
          </Link>
        </div>
        <p className="mt-8 text-center text-sm text-ink-soft">
          Already have an account?{' '}
          <Link href="/account/login" className="font-bold text-coral hover:underline">
            Sign in
          </Link>
        </p>
      </AuthSplit>
    )
  }

  /* ---- the code screen ---- */
  if (step === 'code') {
    return (
      <VerifyCodePanel
        email={email}
        next={next}
        onBack={() => setStep('form')}
        onVerified={() => {
          router.push(next)
          router.refresh()
        }}
      />
    )
  }

  /* ---- "check your inbox" for link mode, and for an existing account ---- */
  if (step === 'link') {
    return (
      <AuthSplit title="Check your inbox" subtitle="One tap and you're in.">
        <div className="card p-6 text-center">
          <span className="tile mx-auto mb-4 h-12 w-12 bg-teal-tint text-teal">
            <MailCheck className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-sm text-ink-soft">
            We&rsquo;ve emailed <strong className="text-ink">{email}</strong>. Tap
            the button in that message to finish setting up your account.
          </p>
          <p className="mt-3 text-xs text-ink-muted">
            It can take a minute to arrive. Do check your spam folder.
          </p>
          <button
            type="button"
            onClick={() => setStep('form')}
            className="btn-secondary mt-6 w-full"
          >
            <ArrowLeft className="h-4 w-4" /> Use a different email
          </button>
        </div>
      </AuthSplit>
    )
  }

  /* ---- the form ---- */
  function onSubmit(fd: FormData) {
    const typed = String(fd.get('email') ?? '')
    start(async () => {
      const res = await startRegistration(fd)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setEmail(typed)
      if (res.step === 'done') {
        toast.success(res.message)
        router.push(next)
        router.refresh()
        return
      }
      toast.success(res.message)
      setStep(res.step)
    })
  }

  return (
    <AuthSplit
      title="Create your account"
      subtitle="Keep every resource you download, forever."
    >
      <SocialButtons providers={providers} next={next} label="or sign up with email" />

      <form action={onSubmit} className={providers.length ? 'mt-5 space-y-4' : 'space-y-4'}>
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">Email</span>
          <input type="email" name="email" required autoComplete="email" className={field} />
          <span className="mt-1 block text-xs text-ink-muted">
            Use the same address you bought with and your files appear
            automatically.
          </span>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">Password</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={field}
          />
          <span className="mt-1 block text-xs text-ink-muted">
            At least 8 characters.
          </span>
        </label>

        {showInvite ? (
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-ink">
              Invite code from Ms Betty
            </span>
            <input
              type="text"
              name="invite"
              value={invite}
              onChange={(e) => setInvite(e.target.value.toUpperCase())}
              placeholder="e.g. LEO-4Q9K"
              className={`${field} uppercase`}
            />
            <span className="mt-1 block text-xs text-ink-muted">
              Links your child&rsquo;s homework and lesson feedback.
            </span>
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:text-coral"
          >
            <Ticket className="h-4 w-4" /> I have an invite code from Ms Betty
          </button>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating…
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" /> Create account
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-soft">
        Already have an account?{' '}
        <Link href="/account/login" className="font-bold text-coral hover:underline">
          Sign in
        </Link>
      </p>
    </AuthSplit>
  )
}
