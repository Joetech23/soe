import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown, ArrowRight } from 'lucide-react'
import { FAQS, site, whatsappHref, mailHref } from '@/lib/site'
import { siteUrl } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { Reveal } from '@/components/reveal'
import { Icon } from '@/components/icon'

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers to common questions about tuition with Ms Betty: payment, what to bring, lesson length and how we communicate.',
  alternates: { canonical: siteUrl('/faq') },
  openGraph: {
    title: 'FAQ, Spirit of Excellence Tuition',
    description: 'Payment, what to bring, lesson length and how we communicate.',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 section md:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHeader
        eyebrow="Frequently asked"
        title="Questions parents ask."
        lede="A quick guide to the practical bits, so you know exactly what to expect before your child's first session."
      />

      <Reveal className="mt-12 space-y-3">
        {FAQS.map((f) => (
          <details
            key={f.q}
            className="card group overflow-hidden [&_summary]:list-none"
          >
            <summary className="flex cursor-pointer items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
              <span className="tile h-10 w-10 shrink-0 bg-teal-tint text-teal">
                <Icon name={f.icon} className="h-5 w-5" />
              </span>
              <span className="flex-1 font-display text-lg font-semibold text-ink">
                {f.q}
              </span>
              <ChevronDown
                className="h-5 w-5 shrink-0 text-teal transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="px-5 pb-5 pl-[4.25rem] text-ink-soft">{f.a}</p>
          </details>
        ))}
      </Reveal>

      <Reveal className="mt-12">
        <div className="card p-6 text-center md:p-8">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Still have a question?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-ink-soft">
            WhatsApp or text {site.owner} on{' '}
            <a href={whatsappHref} className="font-semibold text-coral hover:underline">
              {site.contact.whatsappDisplay}
            </a>
            , or email{' '}
            <a href={mailHref} className="font-semibold text-coral hover:underline">
              {site.contact.email}
            </a>
            .
          </p>
          <Link href="/bookings" className="btn-primary mt-6">
            Book a session <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>
    </div>
  )
}
