import { AdminPending } from '@/components/admin/pending'

export const metadata = { title: 'Categories', robots: { index: false } }

export default function Page() {
  return (
    <AdminPending
      title={'Categories'}
      subtitle={'Organise resources into Phonics, Reading, KS2 and Parents.'}
      note={'Category management connects when the product tables go live.'}
    />
  )
}
