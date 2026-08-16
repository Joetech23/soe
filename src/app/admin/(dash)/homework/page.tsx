import { AdminPending } from '@/components/admin/pending'

export const metadata = { title: 'Homework', robots: { index: false } }

export default function Page() {
  return (
    <AdminPending
      title={'Homework'}
      subtitle={'Post homework to a group or a single child, with file attachments.'}
      note={'Uploads to the private homework bucket when the backend is connected.'}
    />
  )
}
