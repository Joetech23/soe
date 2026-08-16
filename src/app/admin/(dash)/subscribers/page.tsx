import { AdminPending } from '@/components/admin/pending'

export const metadata = { title: 'Newsletter subscribers', robots: { index: false } }

export default function Page() {
  return (
    <AdminPending
      title={'Newsletter subscribers'}
      subtitle={'Confirmed and pending subscribers, with CSV export.'}
      note={'Your double opt-in list populates here once the newsletter backend is live.'}
    />
  )
}
