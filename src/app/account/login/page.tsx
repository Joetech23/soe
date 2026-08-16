'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Mail, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthSplit } from '@/components/auth-split'

export default function AccountLogin() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/account'

  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}` },
        })
        if (error) throw error
        setSent(true)
        return
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push(next)
      router.refresh()
    } catch (err) {
      // Never reveal whether an address exists — that is an enumeration leak.
      toast.error(
        err instanceof Error && /invalid/i.test(err.message)
          ? 'That email and password combination is not right.'
          : err instanceof Error
            ? err.message
            : 'Could not sign in.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthSplit title="Check your inbox" subtitle="A sign-in link is on its way.">
        <div className="card p-6 text-center">
          <span className="tile mx-auto mb-4 h-12 w-12 bg-teal-tint text-teal">
            <Mail className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-sm text-ink-soft">
            We&rsquo;ve emailed <strong className="text-ink">{email}</strong> a link
            that signs you straight in. It expires in an hour.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="btn-secondary mt-6 w-full"
          >
            Use a different email
          </button>
        </div>
      </AuthSplit>
    )
  }

  return (
    <AuthSplit
      title="Welcome back"
      subtitle="Sign in to reach your library and your child's portal."
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
        </label>

        {mode === 'password' && (
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-ink">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
            />
          </label>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Please wait…
            </>
          ) : mode === 'magic' ? (
            <>
              <Mail className="h-4 w-4" /> Email me a sign-in link
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" /> Sign in
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
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
