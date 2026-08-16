import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { YEAR_GROUPS, ENRICHMENT, PRICING } from '@/lib/site'
import { siteUrl } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { Reveal } from '@/components/reveal'
import { Icon } from '@/components/icon'
import { Timetable } from '@/components/timetable'

export const metadata: Metadata = {
  title: 'Tuition & Year Groups',
  description:
    'Primary tuition from Reception to Year 6, 11+ preparation, Book Club and Creative Writing. Warm, confidence-building sessions with Ms Betty.',
  alternates: { canonical: siteUrl('/services') },
  openGraph: {
    title: 'Tuition & Year Groups, Spirit of Excellence Tuition',
    description:
      'Reception–Year 6 tuition, 11+ prep, Book Club and Creative Writing.',
  },
}

const tile: Record<string, string> = {
  coral: 'bg-tile-rose text-coral',
  teal: 'bg-tile-sky text-teal',
  gold: 'bg-tile-amber text-gold-deep',
  pencil: 'bg-tile-violet text-ink-soft',
}

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-shell px-4 section md:px-8">
      <div className="grid items-center gap-10 md:grid-cols-[1fr_0.72fr]">
        <PageHeader
          eyebrow="What we learn at Spirit of Excellence"
          title="Tuition, tailored to every year."
          lede="One-to-one and small-group sessions across the primary years, plus enrichment clubs for children hungry for more. Every session is planned around your child."
        />
        <Reveal delay={120} className="relative mx-auto w-full max-w-sm md:max-w-none">
          <div className="absolute -inset-3 rotate-2 rounded-[1.6rem] bg-coral-tint/60" aria-hidden />
          <Image
            src="/images/children-learning-together.jpg"
            alt="Three diverse children happily learning together with a tablet and books"
            width={800}
            height={800}
            className="relative aspect-square w-full rounded-[1.4rem] object-cover shadow-lift"
          />
        </Reveal>
      </div>

      {/* Year groups — a class register */}
      <section className="mt-20">
        <Reveal>
          <span className="badge mb-4">The register</span>
          <h2 className="font-display text-3xl font-semibold text-ink md:text-4xl">
            Year groups
          </h2>
        </Reveal>

        <Reveal className="mt-8 card overflow-hidden">
          {YEAR_GROUPS.map((y, i) => (
            <div
              key={y.title}
              className={`grid gap-4 p-5 sm:grid-cols-[auto_11rem_1fr] sm:items-center sm:gap-6 md:p-6 ${
                i > 0 ? 'border-t border-line' : ''
              }`}
            >
              <span className={`tile h-12 w-12 ${tile[y.tint]}`}>
                <Icon name={y.icon} className="h-5 w-5" />
              </span>
              <div>
                <div className="font-display text-lg font-semibold text-ink">
                  {y.title}
                </div>
                <div className="text-sm font-medium text-teal">{y.subjects}</div>
              </div>
              <p className="max-w-measure text-sm text-ink-soft">{y.blurb}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Enrichment */}
      <section className="mt-20">
        <Reveal>
          <span className="badge mb-4">Going further</span>
          <h2 className="font-display text-3xl font-semibold text-ink md:text-4xl">
            Enrichment clubs
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {ENRICHMENT.map((e, i) => (
            <Reveal key={e.title} delay={i * 90}>
              <div className="card card-hover h-full p-6">
                <span className={`tile h-12 w-12 ${tile[e.tint]}`}>
                  <Icon name={e.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-ink">
                  {e.title}
                </h3>
                <div className="text-sm font-medium text-teal">{e.tagline}</div>
                <p className="mt-2 text-sm text-ink-soft">{e.blurb}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Live timetable, straight from Ms Betty's flyers */}
      <div className="mt-20">
        <Timetable />
      </div>

      {/* Pricing */}
      <section className="mt-20">
        <Reveal>
          <span className="badge mb-4">Fees</span>
          <h2 className="font-display text-3xl font-semibold text-ink md:text-4xl">
            Session pricing
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {PRICING.map((p, i) => (
            <Reveal key={p.name} delay={i * 90}>
              <div className="card card-hover h-full p-6">
                <div className="font-display text-xl font-semibold text-ink">
                  {p.name}
                </div>
                <div className="mt-1 font-display text-3xl font-semibold text-coral">
                  {p.price}
                </div>
                <p className="mt-3 text-sm text-ink-soft">{p.blurb}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal className="mt-16">
        <div className="relative overflow-hidden rounded-card bg-teal p-8 text-center text-white shadow-lift md:p-12">
          <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-10" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold text-white">
              Ready to get started?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/85">
              Book a session for your child, or join the waiting list if your
              preferred slot isn&rsquo;t available yet.
            </p>
            <Link
              href="/bookings"
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-white px-6 py-3 text-sm font-bold text-teal-deep transition-transform hover:-translate-y-0.5"
            >
              Book or join the waiting list <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
