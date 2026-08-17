'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, KeyRound } from 'lucide-react'
import { setNewPassword } from '@/app/account/auth-actions'
import { AuthSplit } from '@/components/auth-split'

const field =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20'

export function NewPasswordForm({ email }: { email: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const tooShort = password.length > 0 && password.length < 8
  const mismatch = confirm.length > 0 && confirm !== password

  return (
    <AuthSplit
      title="Choose a new password"
      subtitle={`Setting a new password for ${email}.`}
    >
      <form
        action={(fd) =>
          start(async () => {
            const res = await setNewPassword(fd)
            if (!res.ok) {
              toast.error(res.message)
              return
            }
            toast.success(res.message)
            router.push('/account')
            router.refresh()
          })
        }
        className="space-y-4"
      >
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">New password</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
          <span
            className={`mt-1 block text-xs ${tooShort ? 'text-coral' : 'text-ink-muted'}`}
          >
            At least 8 characters.
          </span>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">
            Confirm new password
          </span>
          <input
            type="password"
            name="confirm"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={field}
          />
          {mismatch && (
            <span className="mt-1 block text-xs text-coral">
              These two don&rsquo;t match yet.
            </span>
          )}
        </label>

        <button
          type="submit"
          disabled={pending || password.length < 8 || confirm !== password}
          className="btn-primary w-full"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" /> Save my new password
            </>
          )}
        </button>
      </form>
    </AuthSplit>
  )
}
