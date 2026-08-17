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
  searchParams: { next?: string }
}) {
  const raw = searchParams.next ?? '/account'
  const next = raw.startsWith('/') ? raw : '/account'
  const providers = await activeSocialProviders()

  return <LoginForm next={next} providers={providers} />
}
