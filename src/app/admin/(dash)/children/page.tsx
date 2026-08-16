import { AdminPending } from '@/components/admin/pending'

export const metadata = { title: 'Children & invite codes', robots: { index: false } }

export default function Page() {
  return (
    <AdminPending
      title={'Children & invite codes'}
      subtitle={'Add children, assign groups and issue parent invite codes.'}
      note={'The existing invite-code flow reconnects here once the database is live.'}
    />
  )
}
