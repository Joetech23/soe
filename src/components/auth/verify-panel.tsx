'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, ArrowLeft, RotateCw, CheckCircle2 } from 'lucide-react'
import { verifyCode, resendCode } from '@/app/account/auth-actions'
import { AuthSplit } from '@/components/auth-split'
import { CodeInput } from '@/components/auth/code-input'

/**
 * The one-time verification screen.
 *
 * This is the only extra step a parent ever sees: it happens once, proves the
 * address is real before homework notifications start going to it, and from
 * then on sign-in is just email and password.
 */
export function VerifyCodePanel({
  email,
  onBack,
  onVerified,
}: {
  email: string
  next?: string
  onBack: () => void
  onVerified: () => void
}) {
  const [code, setCode] = useState('')
  const [pending, start] = useTransition()
  const [resending, startResend] = useTransition()
  const [done, setDone] = useState(false)
  const [cooldown, setCooldown] = useState(30)

  // A resend button that is live immediately invites double-sends while the
  // first email is still in flight.
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function submit(value: string) {
    if (value.length < 6 || pending || done) return
    start(async () => {
      const res = await verifyCode(email, value)
      if (!res.ok) {
        toast.error(res.message)
        setCode('')
        return
      }
      setDone(true)
      toast.success(res.message)
      // Let the tick register before navigating.
      setTimeout(onVerified, 700)
    })
  }

  return (
    <AuthSplit
      title={done ? "You're verified" : 'Check your email'}
      subtitle={
        done
          ? 'Taking you to your account…'
          : 'We sent you a code. You only need to do this once.'
      }
    >
      <div className="card p-6">
        <span
          className={`tile mx-auto mb-5 h-12 w-12 ${
            done ? 'bg-tile-mint text-success' : 'bg-teal-tint text-teal'
          }`}
        >
          {done ? (
            <CheckCircle2 className="h-6 w-6" aria-hidden />
          ) : (
            <ShieldCheck className="h-6 w-6" aria-hidden />
          )}
        </span>

        <p className="mb-5 text-center text-sm text-ink-soft">
          Enter the code we emailed to{' '}
          <strong className="break-all text-ink">{email}</strong>
        </p>

        <CodeInput
          value={code}
          onChange={setCode}
          onComplete={submit}
          disabled={pending || done}
        />

        <button
          type="button"
          onClick={() => submit(code)}
          disabled={pending || done || code.length < 6}
          className="btn-primary mt-5 w-full"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Checking…
            </>
          ) : done ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> Verified
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" /> Confirm my email
            </>
          )}
        </button>

        {!done && (
          <div className="mt-5 space-y-2 text-center">
            <button
              type="button"
              disabled={resending || cooldown > 0}
              onClick={() =>
                startResend(async () => {
                  const res = await resendCode(email)
                  if (res.ok) {
                    toast.success(res.message)
                    setCooldown(30)
                    setCode('')
                  } else {
                    toast.error(res.message)
                  }
                })
              }
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal transition-colors hover:text-coral disabled:opacity-50 disabled:hover:text-teal"
            >
              {resending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCw className="h-3.5 w-3.5" />
              )}
              {cooldown > 0 ? `Send a new code (${cooldown}s)` : 'Send a new code'}
            </button>
            <p className="text-xs text-ink-muted">
              The code lasts an hour. Check your spam folder if it hasn&rsquo;t
              arrived.
            </p>
          </div>
        )}
      </div>

      {!done && (
        <button
          type="button"
          onClick={onBack}
          className="mt-6 inline-flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Use a different email
        </button>
      )}
    </AuthSplit>
  )
}
