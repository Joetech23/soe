import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { CheckoutClient } from './checkout-client'

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
}

export default function CheckoutPage() {
  return (
    <div className="shell section">
      <PageHeader
        eyebrow="Checkout"
        title="Almost there."
        lede="Your files are delivered the moment you're done — on screen and by email."
      />
      <div className="mt-12">
        <CheckoutClient />
      </div>
    </div>
  )
}
