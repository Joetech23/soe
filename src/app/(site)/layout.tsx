import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { AnnouncementBar } from '@/components/announcement-bar'
import { ScrollProgress } from '@/components/motion'
import { StickyContact } from '@/components/sticky-contact'
import { CartProvider } from '@/lib/cart-context'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <ScrollProgress />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        >
          Skip to content
        </a>
        <AnnouncementBar />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <StickyContact />
      </div>
    </CartProvider>
  )
}
