import { RegisterForm } from '@/components/auth/register-form'
import { activeSocialProviders, getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Create an account', robots: { index: false } }

export default async function AccountRegister({
  searchParams,
}: {
  searchParams: { next?: string }
}) {
  const raw = searchParams.next ?? '/account'
  const next = raw.startsWith('/') ? raw : '/account'
  const [providers, settings] = await Promise.all([
    activeSocialProviders(),
    getSettings(),
  ])

  return (
    <RegisterForm
      next={next}
      providers={providers}
      allowRegistration={settings.allowRegistration}
    />
  )
}
