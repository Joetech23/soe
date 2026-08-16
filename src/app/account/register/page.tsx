'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, UserPlus, Ticket } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { redeemInviteCode } from '@/lib/supabase/rpc'
import { AuthSplit } from '@/components/auth-split'

export default function AccountRegister() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/account'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [invite, setInvite] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}` },
      })
      if (error) throw error

      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) {
        // Email confirmation is on. Stash the code so it is redeemed after the
        // first successful sign-in rather than being silently dropped.
        if (invite.trim()) {
          try {
            sessionStorage.setItem('soe.pendingInvite', invite.trim().toUpperCase())
          } catch {
            /* private mode — they can enter it again from their profile */
          }
        }
        toast.success('Account created. Check your email to confirm, then sign in.')
        router.push('/account/login')
        return
      }

      if (invite.trim()) {
        try {
          await redeemInviteCode(supabase, invite.trim().toUpperCase())
          toast.success("Welcome! Your child's portal is linked.")
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : 'That invite code did not work.'
          )
        }
      } else {
        toast.success('Welcome! Your account is ready.')
      }
      router.push(next)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create your account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplit
      title="Create your account"
      subtitle="Keep every resource you download, forever."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
          />
          <span className="mt-1 block text-xs text-ink-muted">
            Use the same address you bought with and your files appear
            automatically.
          </span>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">Password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
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
              value={invite}
              onChange={(e) => setInvite(e.target.value.toUpperCase())}
              placeholder="e.g. LEO-4Q9K"
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm uppercase focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
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

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
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
