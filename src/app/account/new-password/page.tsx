import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewPasswordForm } from '@/components/auth/new-password-form'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Set a new password', robots: { index: false } }

/**
 * Reached from the reset email, after /auth/confirm has already exchanged the
 * recovery token for a session. So the guard here is simply "is there a
 * session" — someone arriving cold gets sent to request a fresh link rather
 * than a form that cannot work.
 */
export default async function NewPassword() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/account/login?error=reset_expired')

  return <NewPasswordForm email={user.email ?? ''} />
}
