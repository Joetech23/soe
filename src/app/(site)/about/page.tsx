import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, GraduationCap, Smile, ArrowRight } from 'lucide-react'
import { site } from '@/lib/site'
import { siteUrl } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { Reveal } from '@/components/reveal'

export const metadata: Metadata = {
  title: 'About Ms Betty',
  description:
    'Meet Ms Betty, the primary school tutor behind Spirit of Excellence Tuition. Warm, patient teaching that builds confidence from Reception to Year 6 and 11+.',
  alternates: { canonical: siteUrl('/about') },
  openGraph: {
    title: 'About Ms Betty, Spirit of Excellence Tuition',
    description: 'Confidence-first primary tutoring with Ms Betty.',
  },
}

const CARDS = [
  {
    icon: Heart,
    tile: 'bg-tile-rose text-coral',
    title: 'A calm, kind space',
    body: "Sessions feel warm, not pressured. Mistakes are welcome, they're where the learning happens.",
  },
  {
    icon: GraduationCap,
    tile: 'bg-tile-sky text-teal',
    title: 'Rooted in the curriculum',
    body: 'Everything maps to the National Curriculum, so what we do at tuition supports what’s happening at school.',
  },
  {
    icon: Smile,
    tile: 'bg-tile-amber text-gold-deep',
    title: 'Made for your child',
    body: 'Every child gets a plan shaped around them, their pace, their interests, their goals.',
  },
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-shell px-4 section md:px-8">
      <div className="grid items-center gap-12 md:grid-cols-[1fr_0.82fr]">
        <PageHeader
          eyebrow="Meet your tutor"
          title="Hello, I'm Ms Betty."
          lede="I've spent years walking alongside primary-aged children as they learn to read, count and problem solve. What I love most isn't just correct answers, it's the moment a child realises they can do more than they think. It's the moment their confidence blooms and they become unstoppable."
        >
          <p className="mt-4 max-w-measure text-lg leading-relaxed text-ink-soft">
            Spirit of Excellence Tuition was born from that moment, over and over.
            It&rsquo;s small-group and one-to-one tuition where children feel safe
            to try, safe to get it wrong and proud when they get it right. We work
            on the basics with care and we stretch just far enough to keep it
            exciting.
          </p>
          <p className="mt-5 font-display text-xl font-medium text-teal-deep">
            &ldquo;{site.mission}&rdquo;
          </p>
        </PageHeader>

        <Reveal delay={120} className="relative mx-auto w-full max-w-sm md:max-w-none">
          <div className="absolute -inset-3 -rotate-2 rounded-[1.6rem] bg-teal-tint/60" aria-hidden />
          <Image
            src="/images/betty-portrait.jpg"
            alt="Ms Betty, founder of Spirit of Excellence Tuition"
            width={800}
            height={1000}
            className="relative aspect-[4/5] w-full rounded-[1.4rem] object-cover shadow-lift"
          />
        </Reveal>
      </div>

      {/* The name — Ms Betty's own words */}
      <Reveal className="mt-20">
        <div className="relative overflow-hidden rounded-xl2 border border-line bg-surface shadow-card">
          <div className="bg-mesh pointer-events-none absolute inset-0 opacity-60" aria-hidden />
          <div className="relative grid gap-10 p-8 md:p-12 lg:grid-cols-[1fr_0.75fr] lg:items-center">
            <div className="max-w-measure">
              <span className="badge mb-5">Where the name comes from</span>
              <h2 className="font-display text-3xl font-bold tracking-tight text-ink md:text-4xl">
                An <span className="accent">excellent spirit</span>
              </h2>

              <blockquote className="mt-6 border-l-2 border-coral pl-5">
                <p className="font-display text-lg font-medium leading-relaxed text-ink">
                  The name Spirit of Excellence was inspired by the story of Daniel
                  in the Bible, who was recognised for having an &ldquo;excellent
                  spirit&rdquo;.
                </p>
              </blockquote>

              <p className="mt-5 leading-relaxed text-ink-soft">
                This is at the heart of my vision for every child I tutor. For me,
                excellence isn&rsquo;t about being perfection. It&rsquo;s about
                helping children discover what they are capable of, develop
                confidence in themselves and take pride in their own progress.
              </p>
              <p className="mt-4 leading-relaxed text-ink-soft">
                My goal is not just to help children achieve academically, but to
                help them recognise their potential and develop a spirit of
                excellence that they can carry with them beyond the classroom.
              </p>

              <p className="mt-6 font-display text-base font-bold text-teal-deep">
                &mdash; {site.owner}
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-xs lg:max-w-none">
              <Image
                src="/images/betty-phonics.jpg"
                alt="Ms Betty pointing to a phonics sound card during an online lesson"
                width={700}
                height={900}
                className="aspect-[4/5] w-full rounded-[1.4rem] object-cover shadow-lift"
              />
            </div>
          </div>
        </div>
      </Reveal>

      <div className="mt-16 grid gap-5 sm:grid-cols-3">
        {CARDS.map((c, i) => (
          <Reveal key={c.title} delay={i * 90}>
            <div className="card card-hover h-full p-6">
              <span className={`tile h-12 w-12 ${c.tile}`}>
                <c.icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold text-ink">
                {c.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{c.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-16">
        <div className="relative overflow-hidden rounded-card bg-teal p-8 text-center text-white shadow-lift md:p-12">
          <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-10" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold text-white">
              Let&rsquo;s chat about your child
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/85">
              Every journey starts with a friendly conversation.
            </p>
            <Link
              href="/bookings"
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-white px-6 py-3 text-sm font-bold text-teal-deep transition-transform hover:-translate-y-0.5"
            >
              Get in touch <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
