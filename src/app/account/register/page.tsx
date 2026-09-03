import { RegisterForm } from '@/components/auth/register-form'
import { activeSocialProviders, getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Create an account', robots: { index: false } }

export default async function AccountRegister({
  searchParams,
}: {
  searchParams: { next?: string; code?: string }
}) {
  // A parent arriving from Ms Betty's join link carries their code in the URL,
  // so it is never typed and never mistyped. Landing them on the child portal
  // afterwards means they see their children immediately.
  const code = (searchParams.code ?? '').trim().toUpperCase().slice(0, 40)
  const raw = searchParams.next ?? (code ? '/account/child' : '/account')
  const next = raw.startsWith('/') ? raw : '/account'
  const [providers, settings] = await Promise.all([
    activeSocialProviders(),
    getSettings(),
  ])

  return (
    <RegisterForm
      next={next}
      defaultInvite={code}
      providers={providers}
      allowRegistration={settings.allowRegistration}
    />
  )
}
