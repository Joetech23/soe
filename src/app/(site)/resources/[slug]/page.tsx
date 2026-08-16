import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { getProducts, getProductBySlug, getCategories, styleFor } from '@/lib/shop'
import { siteUrl, formatPrice } from '@/lib/utils'
import { Icon } from '@/components/icon'
import { FreeDownloadForm } from '@/components/free-download-form'
import { AddToBasket } from '@/components/add-to-basket'

export const revalidate = 300

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const product = await getProductBySlug(params.slug)
  if (!product) return {}
  return {
    title: product.name,
    description: product.summary ?? undefined,
    alternates: { canonical: siteUrl(`/resources/${product.slug}`) },
    openGraph: { title: product.name, description: product.summary ?? undefined },
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug)
  if (!product) notFound()

  const categories = await getCategories()
  const category = categories.find((c) => c.id === product.category_id)
  const s = styleFor(product, category?.name)
  const free = product.is_free

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.summary,
    category: category?.name,
    offers: {
      '@type': 'Offer',
      price: (product.price_pence / 100).toFixed(2),
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
      url: siteUrl(`/resources/${product.slug}`),
    },
  }

  return (
    <div className="mx-auto max-w-5xl px-5 section md:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/resources"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:text-coral"
      >
        <ArrowLeft className="h-4 w-4" /> All resources
      </Link>

      <div className="mt-8 grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-start">
        <div className="grid aspect-[3/4] place-items-center rounded-xl2 border border-line bg-gradient-to-br from-teal-tint/60 to-coral-tint/40 shadow-card">
          <span className={`tile h-24 w-24 bg-white/70 shadow-xs ${s.tile.split(' ').pop()}`}>
            <Icon name={s.icon} className="h-11 w-11" />
          </span>
        </div>

        <div>
          <span className="badge mb-3">
            {category?.name ?? 'Resource'} ·{' '}
            {product.product_type === 'video' ? 'Recorded webinar' : 'Printable PDF'}
          </span>
          <h1 className="font-display text-3xl font-bold leading-tight text-ink md:text-4xl">
            {product.name}
          </h1>
          <p className="mt-4 max-w-measure text-lg text-ink-soft">{product.summary}</p>

          <div className="mt-6">
            <span
              className={`font-display text-3xl font-bold ${free ? 'text-success' : 'text-coral'}`}
            >
              {free ? 'Free' : formatPrice(product.price_pence)}
            </span>
          </div>

          <div className="mt-6">
            {free ? (
              <FreeDownloadForm productSlug={product.slug} productName={product.name} />
            ) : (
              <AddToBasket
                line={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  pricePence: product.price_pence,
                }}
              />
            )}
            <p className="mt-3 text-sm text-ink-muted">
              {free
                ? 'Enter your email and download instantly.'
                : 'Instant download after checkout, plus a copy by email.'}
            </p>
          </div>

          <ul className="mt-8 space-y-2.5 border-t border-line pt-6 text-sm text-ink-soft">
            {[
              'Written by Ms Betty for UK primary families',
              product.product_type === 'video'
                ? 'Watch anytime, as often as you like'
                : 'Instant download, print at home',
              'Yours to keep',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <span className="tile h-5 w-5 bg-success-tint text-success">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
