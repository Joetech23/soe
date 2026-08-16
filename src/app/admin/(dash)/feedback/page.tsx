import { AdminPending } from '@/components/admin/pending'

export const metadata = { title: 'Lesson feedback', robots: { index: false } }

export default function Page() {
  return (
    <AdminPending
      title={'Lesson feedback'}
      subtitle={'Send lesson notes to parents in the portal.'}
      note={'Feedback notes save to the database once wiring is complete.'}
    />
  )
}
