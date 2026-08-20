import type { Metadata } from 'next'
import Link from 'next/link'
import { Star, Quote, ArrowRight } from 'lucide-react'
import { site, type Testimonial } from '@/lib/site'
import { getApprovedTestimonials, REVIEW_TOPICS } from '@/lib/reviews'
import { ReviewForm } from '@/components/reviews/review-form'
import { siteUrl } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { Reveal } from '@/components/motion'

export const metadata: Metadata = {
  title: 'Testimonials',
  description:
    'What parents say about learning with Ms Betty at Spirit of Excellence Tuition — phonics, maths, 11+ prep and holiday programmes.',
  alternates: { canonical: siteUrl('/testimonials') },
  openGraph: {
    title: 'Testimonials, Spirit of Excellence Tuition',
    description: 'Real reviews from families learning with Ms Betty.',
  },
}

const buildJsonLd = (TESTIMONIALS: Testimonial[]) => ({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': siteUrl('/#business'),
  name: site.name,
  description: site.meta.description,
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '5',
    reviewCount: String(TESTIMONIALS.length),
    bestRating: '5',
    worstRating: '1',
  },
  review: TESTIMONIALS.map((t) => ({
    '@type': 'Review',
    reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
    author: { '@type': 'Person', name: t.author },
    reviewBody: t.quote,
    name: t.topic,
  })),
})

function Stars({ className }: { className?: string }) {
  return (
    <div className={`flex gap-0.5 ${className ?? ''}`} aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-4 w-4 text-gold" fill="currentColor" aria-hidden />
      ))}
    </div>
  )
}

function Card({ t }: { t: Testimonial }) {
  return (
    <figure className="card flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="badge">{t.topic}</span>
        <Quote className="h-6 w-6 shrink-0 text-teal/25" aria-hidden />
      </div>
      <blockquote className="mt-4 flex-1 leading-relaxed text-ink">
        <p>{t.quote}</p>
      </blockquote>
      <figcaption className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <span className="text-sm font-bold text-teal-deep">{t.author}</span>
        <Stars />
      </figcaption>
    </figure>
  )
}

export const revalidate = 300

export default async function TestimonialsPage() {
  const TESTIMONIALS = await getApprovedTestimonials()
  const jsonLd = buildJsonLd(TESTIMONIALS)

  return (
    <div className="shell section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHeader
        eyebrow="Testimonials"
        title="What families say."
        lede="Every review below is from a parent whose child learns with Ms Betty — phonics, maths boosters, 11+ prep and holiday programmes."
      />

      <Reveal className="mt-8 flex flex-wrap items-center gap-4">
        <Stars />
        <p className="text-sm font-semibold text-ink">
          5.0 from {TESTIMONIALS.length} parent reviews
        </p>
      </Reveal>

      {/* Longer reviews get their own row so they stay readable; the shorter
          ones sit three-up underneath. */}
      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {TESTIMONIALS.filter((t) => t.feature).map((t, i) => (
          <Reveal key={`${t.topic}-${i}`} delay={i * 90}>
            <Card t={t} />
          </Reveal>
        ))}
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TESTIMONIALS.filter((t) => !t.feature).map((t, i) => (
          <Reveal key={`${t.topic}-${i}`} delay={i * 80}>
            <Card t={t} />
          </Reveal>
        ))}
      </div>

      {/* Parents can add their own; nothing appears until Ms Betty approves it. */}
      <Reveal className="mt-16">
        <div className="mx-auto max-w-2xl">
          <ReviewForm topics={REVIEW_TOPICS} />
        </div>
      </Reveal>

      <Reveal className="mt-16 text-center">
        <h2 className="font-display text-3xl font-bold text-ink">
          Your child could be next.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          Book a session, or say hello and we&rsquo;ll take it from there.
        </p>
        <Link href="/bookings" className="btn-primary mt-6">
          Book a session <ArrowRight className="h-4 w-4" />
        </Link>
      </Reveal>
    </div>
  )
}
