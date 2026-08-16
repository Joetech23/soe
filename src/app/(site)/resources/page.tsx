import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getProducts, getCategories, styleFor } from '@/lib/shop'
import type { ProductRow } from '@/lib/supabase/types'
import { siteUrl, formatPrice } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { Reveal } from '@/components/motion'
import { Icon } from '@/components/icon'

/** Rebuild every 5 minutes so admin price/catalogue edits appear without a deploy. */
export const revalidate = 300

export const metadata: Metadata = {
  title: 'Resources Hub',
  description:
    'Free and paid primary learning resources from Ms Betty: phonics guides, reading lists, parents evening tips, KS2 inference cards and school readiness guides.',
  alternates: { canonical: siteUrl('/resources') },
  openGraph: {
    title: 'Resources Hub, Spirit of Excellence Tuition',
    description: 'Phonics, reading, KS2 and parent guides from Ms Betty.',
  },
}

function ProductCard({
  product,
  categoryName,
}: {
  product: ProductRow
  categoryName?: string
}) {
  const s = styleFor(product, categoryName)
  return (
    <Link
      href={`/resources/${product.slug}`}
      className="card card-hover group flex h-full flex-col p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`tile h-12 w-12 ${s.tile}`}>
          <Icon name={s.icon} className="h-5 w-5" />
        </span>
        <span
          className={
            product.is_free
              ? 'pill bg-success-tint text-success'
              : 'pill bg-gold-tint text-gold-deep'
          }
        >
          {product.is_free ? 'Free' : formatPrice(product.price_pence)}
        </span>
      </div>
      <h3 className="mt-4 font-display text-lg font-bold leading-snug text-ink">
        {product.name}
      </h3>
      <p className="mt-1.5 flex-1 text-sm text-ink-soft">{product.summary}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-coral">
        {product.is_free ? 'Get it free' : 'View'}
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

export default async function ResourcesPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        description: p.summary,
        url: siteUrl(`/resources/${p.slug}`),
        offers: {
          '@type': 'Offer',
          price: (p.price_pence / 100).toFixed(2),
          priceCurrency: 'GBP',
          availability: 'https://schema.org/InStock',
        },
      },
    })),
  }

  return (
    <div className="shell section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHeader
        eyebrow="Free & premium for families"
        title="Resources Hub"
        lede="Ms Betty's growing library of guides, printables and webinars for primary families — downloaded straight from here, with your receipt and files delivered instantly."
      />

      {categories.length > 0 && (
        <Reveal className="mt-8 flex flex-wrap gap-2">
          {categories.map((c) => (
            <a
              key={c.slug}
              href={`#cat-${c.slug}`}
              className="rounded-pill border border-line bg-surface px-4 py-2 text-sm font-semibold text-teal-deep transition-colors hover:bg-teal-tint"
            >
              {c.name}
            </a>
          ))}
        </Reveal>
      )}

      {products.length === 0 ? (
        <div className="card mt-12 p-10 text-center">
          <p className="text-ink-soft">
            The resource library is being set up. Please check back shortly.
          </p>
        </div>
      ) : (
        <div className="mt-12 space-y-16">
          {categories.map((cat) => {
            const items = products.filter((p) => p.category_id === cat.id)
            if (items.length === 0) return null
            return (
              <section key={cat.id} id={`cat-${cat.slug}`} className="scroll-mt-24">
                <Reveal className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl font-bold text-ink md:text-3xl">
                    {cat.name}
                  </h2>
                  <span className="text-sm font-medium text-ink-muted">
                    {items.length} {items.length === 1 ? 'resource' : 'resources'}
                  </span>
                </Reveal>
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((p, i) => (
                    <Reveal key={p.id} delay={i * 70}>
                      <ProductCard product={p} categoryName={cat.name} />
                    </Reveal>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <Reveal className="mt-16">
        <div className="relative overflow-hidden rounded-xl2 bg-teal p-8 text-center text-white shadow-lift md:p-12">
          <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-10" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold text-white">
              Want new resources in your inbox?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/85">
              Join the newsletter and Ms Betty will send fresh downloads, reading
              picks and parent tips straight to you.
            </p>
            <Link href="/newsletter" className="btn-white mt-6">
              Join the newsletter <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
