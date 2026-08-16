import type { Metadata } from 'next'
import { Sparkles, Check } from 'lucide-react'
import { siteUrl } from '@/lib/utils'
import { Reveal } from '@/components/reveal'
import { NewsletterForm } from './newsletter-form'

export const metadata: Metadata = {
  title: 'Newsletter',
  description:
    "Sign up for Ms Betty's parent newsletter, weekly learning tips, reading recommendations and free primary school resources.",
  alternates: { canonical: siteUrl('/newsletter') },
  openGraph: {
    title: 'Newsletter, Spirit of Excellence Tuition',
    description:
      'Learning tips, reading recommendations and free resources, straight to your inbox.',
  },
}

const BENEFITS = [
  'Age-appropriate book recommendations',
  "Simple ways to practise at home (that don't feel like homework)",
  'Confidence-building conversation prompts',
  'Early notice of new sessions and clubs',
]

export default function NewsletterPage() {
  return (
    <section className="mx-auto grid max-w-shell gap-12 px-4 section md:grid-cols-2 md:items-center md:px-8">
      <Reveal>
        <span className="badge mb-4">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> Parent newsletter
        </span>
        <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl md:text-[3.4rem]">
          Little sparks of learning, in your inbox.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">
          A short, warm note from Ms Betty every few weeks, with a reading pick, a
          maths trick, a fun activity for the weekend, and the occasional free
          printable. No spam, ever. Unsubscribe any time.
        </p>

        <ul className="mt-7 space-y-3 text-sm text-ink-soft">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-3">
              <span className="tile mt-0.5 h-6 w-6 shrink-0 bg-success-tint text-success">
                <Check className="h-3.5 w-3.5" aria-hidden />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delay={120}>
        <NewsletterForm />
      </Reveal>
    </section>
  )
}
