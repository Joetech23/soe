import { AdminPending } from '@/components/admin/pending'

export const metadata = { title: 'Enquiries', robots: { index: false } }

export default function Page() {
  return (
    <AdminPending
      title={'Enquiries'}
      subtitle={'Booking requests and waiting-list sign-ups from the site.'}
      note={'Booking-form submissions land here the moment the form backend is connected.'}
    />
  )
}
