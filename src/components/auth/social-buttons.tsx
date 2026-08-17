'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export type SocialProvider = 'google' | 'facebook'

/** Brand marks inlined as SVG — the CSP blocks external images, and these must
 *  render before anything else on the page for the button to be recognisable. */
const MARKS: Record<SocialProvider, React.ReactNode> = {
  google: (
    <svg viewBox="0 0 18 18" className="h-[1.15rem] w-[1.15rem]" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="h-[1.2rem] w-[1.2rem]" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"
      />
    </svg>
  ),
}

const LABELS: Record<SocialProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
}

/**
 * OAuth sign-in buttons.
 *
 * Rendered only for providers that are both switched on in the admin settings
 * and actually enabled in the Supabase project — the server resolves that
 * before this component is reached, so a half-finished setup never shows a
 * button that dead-ends.
 *
 * A social account arrives with its email already proven by the provider, so it
 * skips the verification step entirely.
 */
export function SocialButtons({
  providers,
  next = '/account',
  label = 'or',
}: {
  providers: SocialProvider[]
  next?: string
  label?: string
}) {
  const [busy, setBusy] = useState<SocialProvider | null>(null)
  if (providers.length === 0) return null

  async function go(provider: SocialProvider) {
    setBusy(provider)
    try {
      const supabase = createClient()
      const safeNext = next.startsWith('/') ? next : '/account'
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        },
      })
      if (error) throw error
      // On success the browser is navigating away; leave the spinner running.
    } catch (err) {
      setBusy(null)
      toast.error(
        err instanceof Error ? err.message : `Could not start ${LABELS[provider]} sign-in.`
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5">
        {providers.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            disabled={busy !== null}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2.5 rounded-pill border border-line bg-surface px-4 text-sm font-bold text-ink transition-colors hover:border-ink/25 hover:bg-surface-sunk disabled:opacity-60"
          >
            {busy === p ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              MARKS[p]
            )}
            Continue with {LABELS[p]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {label}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  )
}
