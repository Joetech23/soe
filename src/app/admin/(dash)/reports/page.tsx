import { AdminPending } from '@/components/admin/pending'

export const metadata = { title: 'Reports', robots: { index: false } }

export default function Page() {
  return (
    <AdminPending
      title={'Reports'}
      subtitle={'Revenue, downloads and subscriber trends over time.'}
      note={'Charts and exports appear here once orders and downloads are recorded in the database.'}
    />
  )
}
