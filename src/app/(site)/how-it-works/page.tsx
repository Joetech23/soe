import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { STEPS } from '@/lib/site'
import { siteUrl } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { Reveal } from '@/components/reveal'
import { Icon } from '@/components/icon'

export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'Four simple steps from first hello to confident learner, tuition with Ms Betty made easy for busy families.',
  alternates: { canonical: siteUrl('/how-it-works') },
  openGraph: {
    title: 'How It Works, Spirit of Excellence Tuition',
    description: 'Four simple steps from first hello to confident learner.',
  },
}

const tiles = [
  'bg-tile-rose text-coral',
  'bg-tile-sky text-teal',
  'bg-tile-amber text-gold-deep',
  'bg-tile-mint text-success',
]

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-shell px-4 section md:px-8">
      <PageHeader
        eyebrow="How it works"
        title="Simple, from the very first hello."
        lede="Four gentle steps, no jargon, no pressure, just a clear path to confident learning."
      />

      <ol className="mt-14 grid gap-5 md:grid-cols-2">
        {STEPS.map((s, i) => (
          <Reveal as="li" key={s.title} delay={i * 90}>
            <div className="card card-hover relative h-full p-6">
              <span className="absolute right-6 top-6 font-display text-5xl font-semibold text-line">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className={`tile h-12 w-12 ${tiles[i % tiles.length]}`}>
                <Icon name={s.icon} className="h-6 w-6" />
              </span>
              <h2 className="mt-5 font-display text-2xl font-semibold text-ink">
                {s.title}
              </h2>
              <p className="mt-2 max-w-measure text-ink-soft">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </ol>

      <Reveal className="mt-10 flex flex-wrap gap-3">
        <Link href="/bookings" className="btn-primary">
          Start with a booking <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/faq" className="btn-secondary">
          Read the FAQ
        </Link>
      </Reveal>
    </div>
  )
}
