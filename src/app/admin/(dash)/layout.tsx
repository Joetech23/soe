import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { AdminShell } from '@/components/admin/admin-shell'
import { THEME_COOKIE } from '@/components/admin/theme-toggle'
import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/supabase/rpc'
import { site } from '@/lib/site'
import { getNotificationCount } from './shell-actions'

/**
 * Admin area guard (defence in depth — middleware also checks the role).
 *
 * ADMIN_PREVIEW=true lets the dashboard render with placeholder data before the
 * live database + auth exist. Remove the flag (or leave it unset) for launch,
 * after which a real admin session is required.
 */
const PREVIEW = process.env.ADMIN_PREVIEW === 'true'

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!PREVIEW) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/admin/login')
    const isAdmin = await hasRole(supabase, user.id, 'admin')
    if (!isAdmin) redirect('/account')
  }

  const theme = cookies().get(THEME_COOKIE)?.value === 'dark' ? 'dark' : 'light'
  // Never let a slow count block the whole admin from rendering.
  const notificationCount = await getNotificationCount().catch(() => 0)

  return (
    <AdminShell
      ownerName={site.owner}
      ownerEmail={site.contact.email}
      theme={theme}
      notificationCount={notificationCount}
    >
      {children}
    </AdminShell>
  )
}
