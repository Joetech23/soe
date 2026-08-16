import { AdminPending } from '@/components/admin/pending'

export const metadata = { title: 'Groups & 1:1 slots', robots: { index: false } }

export default function Page() {
  return (
    <AdminPending
      title={'Groups & 1:1 slots'}
      subtitle={'Tuition groups and one-to-one slots for the parent portal.'}
      note={'Carries over from the current parent portal when the database is connected.'}
    />
  )
}
