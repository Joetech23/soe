import { AdminPending } from '@/components/admin/pending'

export const metadata = { title: 'Downloads', robots: { index: false } }

export default function Page() {
  return (
    <AdminPending
      title={'Downloads'}
      subtitle={'Audit trail of every file download and who accessed it.'}
      note={'Each download is logged here once secure file delivery is switched on.'}
    />
  )
}
