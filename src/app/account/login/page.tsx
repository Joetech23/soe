import { LoginForm } from '@/components/auth/login-form'
import { activeSocialProviders } from '@/lib/settings'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Sign in', robots: { index: false } }

/**
 * Server component so the social buttons are decided before render: a provider
 * shows only when Ms Betty has switched it on AND it is actually configured in
 * Supabase.
 */
export default async function AccountLogin({
  searchParams,
}: {
  searchParams: { next?: string; code?: string }
}) {
  // A parent who already has an account and clicks a join link for a new child
  // arrives here. Carrying the code through sign-in drops them on the portal
  // with it prefilled, rather than losing it at the door.
  const code = (searchParams.code ?? '').trim().toUpperCase().slice(0, 40)
  const raw =
    searchParams.next ??
    (code ? `/account/child?code=${encodeURIComponent(code)}` : '/account')
  const next = raw.startsWith('/') ? raw : '/account'
  const providers = await activeSocialProviders()

  return <LoginForm next={next} providers={providers} />
}
