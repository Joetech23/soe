import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { CartProvider } from '@/lib/cart-context'
import { LogoMark } from '@/components/logo'

/**
 * The root 404 lives outside the (site) route group, so it has to supply the
 * CartProvider itself — SiteHeader renders the basket badge.
 */
export default function NotFound() {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-24">
          <div className="flex max-w-md flex-col items-center text-center">
            <LogoMark size={104} className="mb-6" />
            <div className="font-display text-7xl font-bold text-coral">Oops!</div>
            <h1 className="mt-4 font-display text-2xl font-bold text-ink">
              That page has wandered off.
            </h1>
            <p className="mt-2 text-ink-soft">
              Let&rsquo;s head back to somewhere friendly.
            </p>
            <Link href="/" className="btn-primary mt-6">
              Go home
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    </CartProvider>
  )
}
