import type { Metadata } from 'next'
import Link from 'next/link'
import { Star, Quote, ArrowRight } from 'lucide-react'
import { site, TESTIMONIALS } from '@/lib/site'
import { siteUrl } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { Reveal } from '@/components/reveal'

export const metadata: Metadata = {
  title: 'Kind Words',
  description:
    'What parents and children say about learning with Ms Betty at Spirit of Excellence Tuition.',
  alternates: { canonical: siteUrl('/testimonials') },
  openGraph: {
    title: 'Kind Words, Spirit of Excellence Tuition',
    description: 'Testimonials from families learning with Ms Betty.',
  },
}

const jsonLd = {
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
    author: { '@type': 'Person', name: t.author.split(',')[0] },
    reviewBody: t.quote,
  })),
}

function Stars() {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-4 w-4 text-gold" fill="currentColor" aria-hidden />
      ))}
    </div>
  )
}

export default function TestimonialsPage() {
  return (
    <div className="mx-auto max-w-shell px-4 section md:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHeader
        eyebrow="Kind words"
        title="Real stories, real smiles."
        lede="The best thing about tuition isn't the test scores, it's the change in how children feel about themselves. Here's what a few families have shared."
      />

      <div className="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.author} delay={(i % 3) * 80}>
            <figure className="card card-hover break-inside-avoid p-6">
              <div className="flex items-center justify-between">
                <span className="tile h-9 w-9 bg-teal-tint text-teal">
                  <Quote className="h-4 w-4" aria-hidden />
                </span>
                <Stars />
              </div>
              <blockquote className="mt-4 text-ink">
                <p>{t.quote}</p>
              </blockquote>
              <figcaption className="mt-4 text-sm font-semibold text-teal-deep">
                {/* em-dash — the original rendered a stray leading comma here */}
                &mdash; {t.author}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-14 text-center">
        <h2 className="font-display text-3xl font-semibold text-ink">
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
