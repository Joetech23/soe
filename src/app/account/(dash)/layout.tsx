import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { site } from '@/lib/site'
import { AccountNav } from '@/components/account/account-nav'
import { LogoMark } from '@/components/logo'

export const dynamic = 'force-dynamic'

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/account/login?next=/account')

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={40} />
            <span className="leading-tight">
              <span className="block font-display text-base font-bold text-ink">
                My account
              </span>
              <span className="block text-[0.7rem] text-ink-muted">
                {site.shortName}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:block">
              {user.email}
            </span>
            {/* POST so the server clears the auth cookies — a client-side
                signOut leaves httpOnly cookies in place. */}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex min-h-[40px] items-center gap-2 rounded-pill border border-line bg-surface px-4 text-sm font-semibold text-ink-soft transition-colors hover:border-coral hover:text-coral"
              >
                <LogOut className="h-4 w-4" aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        <AccountNav />
        <div className="mt-8">{children}</div>
      </div>
    </div>
  )
}
