import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/admin-shell'
import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/supabase/rpc'
import { site } from '@/lib/site'

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

  return (
    <AdminShell ownerName={site.owner} ownerEmail={site.contact.email}>
      {children}
    </AdminShell>
  )
}
