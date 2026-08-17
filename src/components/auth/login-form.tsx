'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, KeyRound, Mail, MailCheck, ArrowLeft } from 'lucide-react'
import {
  signInWithPassword,
  sendSignInLink,
  sendPasswordReset,
} from '@/app/account/auth-actions'
import { navigateAfterAuth } from '@/lib/auth-navigate'
import { AuthSplit } from '@/components/auth-split'
import { SocialButtons, type SocialProvider } from '@/components/auth/social-buttons'
import { VerifyCodePanel } from '@/components/auth/verify-panel'

const field =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20'

type Mode = 'password' | 'link' | 'reset'

export function LoginForm({
  next,
  providers,
}: {
  next: string
  providers: SocialProvider[]
}) {
  const [pending, start] = useTransition()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState<null | string>(null)
  const [verifying, setVerifying] = useState(false)

  /* An account that never finished verifying lands here rather than a dead end. */
  if (verifying) {
    return (
      <VerifyCodePanel
        email={email}
        next={next}
        onBack={() => setVerifying(false)}
        onVerified={() => {
          navigateAfterAuth(next)
        }}
      />
    )
  }

  if (sent) {
    return (
      <AuthSplit title="Check your inbox" subtitle="It's on its way.">
        <div className="card p-6 text-center">
          <span className="tile mx-auto mb-4 h-12 w-12 bg-teal-tint text-teal">
            <MailCheck className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-sm text-ink-soft">{sent}</p>
          <button
            type="button"
            onClick={() => setSent(null)}
            className="btn-secondary mt-6 w-full"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </button>
        </div>
      </AuthSplit>
    )
  }

  function onSubmit(fd: FormData) {
    const typed = String(fd.get('email') ?? '')
    setEmail(typed)

    start(async () => {
      if (mode === 'link') {
        const res = await sendSignInLink(typed, next)
        res.ok ? setSent(res.message) : toast.error(res.message)
        return
      }
      if (mode === 'reset') {
        const res = await sendPasswordReset(typed)
        res.ok ? setSent(res.message) : toast.error(res.message)
        return
      }

      const res = await signInWithPassword(fd)
      if (res.ok) {
        toast.success(res.message)
        navigateAfterAuth(next)
        return
      }
      toast.error(res.message)
      if (res.needsVerification) setVerifying(true)
    })
  }

  const titles: Record<Mode, { title: string; subtitle: string }> = {
    password: {
      title: 'Welcome back',
      subtitle: "Sign in to reach your library and your child's portal.",
    },
    link: {
      title: 'Email me a link',
      subtitle: "We'll send a link that signs you straight in.",
    },
    reset: {
      title: 'Reset your password',
      subtitle: "Tell us your email and we'll send a reset link.",
    },
  }

  return (
    <AuthSplit {...titles[mode]}>
      {mode === 'password' && (
        <SocialButtons providers={providers} next={next} label="or use your email" />
      )}

      <form
        action={onSubmit}
        className={mode === 'password' && providers.length ? 'mt-5 space-y-4' : 'space-y-4'}
      >
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            defaultValue={email}
            className={field}
          />
        </label>

        {mode === 'password' && (
          <label className="block text-sm">
            <span className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="font-semibold text-ink">Password</span>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="text-xs font-semibold text-teal hover:text-coral"
              >
                Forgotten your password?
              </button>
            </span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className={field}
            />
          </label>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Please wait…
            </>
          ) : mode === 'password' ? (
            <>
              <KeyRound className="h-4 w-4" /> Sign in
            </>
          ) : mode === 'link' ? (
            <>
              <Mail className="h-4 w-4" /> Email me a sign-in link
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" /> Send me a reset link
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'password' ? 'link' : 'password')}
          className="w-full text-center text-sm font-semibold text-teal hover:text-coral"
        >
          {mode === 'password'
            ? 'Or email me a link instead'
            : 'Use my password instead'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-soft">
        New here?{' '}
        <Link href="/account/register" className="font-bold text-coral hover:underline">
          Create an account
        </Link>
      </p>
    </AuthSplit>
  )
}
