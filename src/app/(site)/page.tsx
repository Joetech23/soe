import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Star, Check, Quote, ChevronDown, Play } from 'lucide-react'
import {
  site,
  HERO_STATS,
  SUBJECTS,
  WHY_US,
  STEPS,
  TESTIMONIALS,
  FAQS,
  YEAR_GROUPS,
} from '@/lib/site'
import { getFreeProducts, styleFor } from '@/lib/shop'
import { siteUrl, formatPrice } from '@/lib/utils'
import { WordOfTheDay } from '@/components/word-of-the-day'
import { Icon } from '@/components/icon'
import {
  Reveal,
  CountUp,
  Marquee,
  Spotlight,
  Sparkle,
  TypeWriter,
} from '@/components/motion'

export const metadata: Metadata = {
  title: { absolute: site.meta.title },
  description: site.meta.description,
  alternates: { canonical: siteUrl('/') },
}

const stepTiles = [
  'bg-tile-rose text-coral',
  'bg-tile-sky text-teal',
  'bg-tile-amber text-gold-deep',
  'bg-tile-mint text-success',
]

/** Rebuild every 5 minutes so catalogue edits appear without a deploy. */
export const revalidate = 300

export default async function HomePage() {
  const featured = await getFreeProducts(3)

  return (
    <>
      {/* ─────────────────────────── HERO ─────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="bg-mesh pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="bg-dotgrid pointer-events-none absolute inset-0 opacity-50"
          aria-hidden
        />

        {/* Decorative sparkles */}
        <Sparkle className="pointer-events-none absolute left-[6%] top-28 hidden h-5 w-5 text-gold md:block" />
        <Sparkle
          className="pointer-events-none absolute right-[8%] top-20 hidden h-4 w-4 text-coral md:block"
          delay={900}
        />
        <Sparkle
          className="pointer-events-none absolute bottom-40 left-[12%] hidden h-3.5 w-3.5 text-teal md:block"
          delay={1800}
        />

        <div className="shell relative grid items-center gap-14 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Reveal>
              <span className="badge">
                <Sparkle className="h-3 w-3 text-gold" />
                {site.hero.tagline}
              </span>
            </Reveal>

            <Reveal delay={90}>
              <h1 className="mt-6 font-display text-[2.6rem] font-extrabold leading-[1.03] tracking-tightest text-ink sm:text-[3.4rem] lg:text-[3.9rem]">
                <span className="block">
                  Hello, I&rsquo;m <span className="text-gradient">Ms Betty</span>.
                </span>
                <span className="mt-1.5 block text-ink-soft">
                  I help children find their{' '}
                  <TypeWriter
                    className="text-coral"
                    words={['spark', 'confidence', 'voice', 'courage', 'potential']}
                  />
                </span>
              </h1>
            </Reveal>

            <Reveal delay={170}>
              <p className="mt-6 max-w-measure text-lg leading-relaxed text-ink-soft">
                {site.hero.intro}
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/bookings" className="btn-primary group">
                  Book a session
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link href="/services" className="btn-secondary">
                  See what we teach
                </Link>
              </div>
            </Reveal>

            <Reveal delay={320}>
              {/* Real review count rather than stock avatars — the number is
                  verifiable on the Kind Words page, faces would not be. */}
              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5" aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 text-gold"
                        fill="currentColor"
                        aria-hidden
                      />
                    ))}
                  </div>
                  <span className="font-display text-base font-bold text-ink">5.0</span>
                </div>
                <Link
                  href="/testimonials"
                  className="text-sm text-ink-muted underline-offset-4 hover:text-teal hover:underline"
                >
                  from {TESTIMONIALS.length} parent reviews
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Hero image with floating cards */}
          <Reveal dir="scale" delay={200} className="relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div
                className="absolute -inset-4 -rotate-2 rounded-[2.2rem] bg-gradient-to-br from-coral-tint via-gold-tint to-teal-tint"
                aria-hidden
              />
              <Image
                src="/images/betty-portrait.jpg"
                alt="Ms Betty, primary school tutor"
                width={900}
                height={900}
                priority
                className="relative aspect-square w-full rounded-xl2 object-cover object-top shadow-pop"
              />

              <div className="absolute -left-3 top-8 animate-float-slow rounded-2xl border border-line bg-surface/95 p-3 shadow-lift backdrop-blur sm:-left-6">
                <div className="flex items-center gap-2.5">
                  <span className="tile h-9 w-9 bg-tile-mint text-success">
                    <Check className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <div className="text-xs font-bold text-ink">Confidence first</div>
                    <div className="text-[0.68rem] text-ink-muted">Every session</div>
                  </div>
                </div>
              </div>

              <div
                className="absolute -right-3 bottom-10 animate-float rounded-2xl border border-line bg-surface/95 p-3 shadow-lift backdrop-blur sm:-right-6"
                style={{ animationDelay: '1.2s' }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="tile h-9 w-9 bg-tile-amber text-gold-deep">
                    <Star className="h-4 w-4" fill="currentColor" aria-hidden />
                  </span>
                  <div>
                    <div className="text-xs font-bold text-ink">11+ ready</div>
                    <div className="text-[0.68rem] text-ink-muted">English &amp; VR</div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Stat strip */}
        <div className="shell relative pb-16 md:pb-20">
          <Reveal>
            <div className="grid divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0">
              {HERO_STATS.map((s) => (
                <div key={s.label} className="p-6 text-center">
                  <div className="font-display text-4xl font-extrabold tracking-tight text-ink">
                    <CountUp to={s.value} decimals={s.decimals} suffix={s.suffix} />
                  </div>
                  <div className="mt-1 text-sm font-bold text-coral">{s.label}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">{s.note}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────── YEAR-GROUP MARQUEE ───────────────────── */}
      <section className="border-y border-line bg-surface py-5">
        <Marquee className="marquee-mask" speed="slow">
          {YEAR_GROUPS.map((y) => (
            <span
              key={y.title}
              className="flex items-center gap-3 whitespace-nowrap px-7 font-display text-lg font-bold text-ink-muted"
            >
              {y.title}
              <Sparkle className="h-3 w-3 text-coral/60" />
            </span>
          ))}
        </Marquee>
      </section>

      {/* ───────────────────────── HOW IT WORKS ───────────────────────── */}
      <section className="shell section">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="badge mx-auto">How it works</span>
          <h2 className="mt-5 text-balance font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
            Simple, from the very <span className="accent">first hello</span>
          </h2>
          <p className="mt-4 text-ink-soft">
            Four gentle steps, no jargon, no pressure, just a clear path to
            confident learning.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 100}>
              <Spotlight className="card card-hover h-full p-6">
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className={`tile h-12 w-12 ${stepTiles[i % 4]}`}>
                      <Icon name={s.icon} className="h-5 w-5" />
                    </span>
                    <span className="font-display text-3xl font-extrabold text-line">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-bold text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
                </div>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────────────────── A BETTER WAY TO LEARN ─────────────────────── */}
      {/* Outer wrapper clips the decorative rotated frame at the viewport edge
          so it can bleed on desktop without causing horizontal scroll on phones. */}
      <section className="overflow-hidden">
        <div className="shell section grid items-center gap-14 pt-0 lg:grid-cols-2">
          <Reveal dir="left">
            <span className="badge">About {site.owner}</span>
            <h2 className="mt-5 text-balance font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
              A better way to learn, built for{' '}
              <span className="accent">every child</span>
            </h2>
            <p className="mt-5 max-w-measure leading-relaxed text-ink-soft">
              Spirit of Excellence Tuition is small-group and one-to-one tuition
              where children feel safe to try, safe to get it wrong and proud when
              they get it right. We work on the basics with care and stretch just
              far enough to keep it exciting.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <div className="font-display text-lg font-bold text-ink">
                  Real progress, gently paced
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  Lessons are age-appropriate in length so children stay focused
                  and finish feeling capable.
                </p>
              </div>
              <div>
                <div className="font-display text-lg font-bold text-ink">
                  Learning that fits your family
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  Evenings, weekends or weekday daytimes for home-educating
                  families — whatever suits.
                </p>
              </div>
            </div>

            <Link href="/about" className="btn-secondary mt-8">
              More about {site.owner}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>

          <Reveal dir="right" delay={120} className="relative">
            <div
              className="absolute -inset-4 rotate-2 rounded-[2.2rem] bg-gradient-to-tr from-teal-tint via-surface to-coral-tint"
              aria-hidden
            />
            <Image
              src="/images/betty-teaching.jpg"
              alt="Ms Betty teaching place value on a whiteboard during a Zoom lesson"
              width={900}
              height={900}
              className="relative aspect-[4/3] w-full rounded-xl2 object-cover shadow-lift"
            />
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── WHY CHOOSE US ───────────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="shell section">
          <div className="grid items-start gap-14 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal dir="left" className="lg:sticky lg:top-28">
              <span className="badge">Our advantage</span>
              <h2 className="mt-5 text-balance font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
                Why families <span className="accent">choose Ms Betty</span>
              </h2>
              <p className="mt-4 max-w-measure text-ink-soft">
                The difference that makes learning calmer, kinder and a great deal
                more fun.
              </p>
              <div className="relative mt-8 hidden lg:block">
                <Image
                  src="/images/betty-seated.jpg"
                  alt="Ms Betty smiling, seated in her tutoring room"
                  width={800}
                  height={800}
                  className="aspect-square w-full rounded-xl2 object-cover shadow-lift"
                />
              </div>
            </Reveal>

            <div className="grid gap-4 sm:grid-cols-2">
              {WHY_US.map((f, i) => (
                <Reveal key={f.title} delay={i * 80}>
                  <Spotlight className="card card-hover h-full p-5">
                    <div className="relative z-10">
                      <span className="tile h-11 w-11 bg-teal-tint text-teal">
                        <Icon name={f.icon} className="h-5 w-5" />
                      </span>
                      <h3 className="mt-4 font-display text-lg font-bold text-ink">
                        {f.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                        {f.body}
                      </p>
                    </div>
                  </Spotlight>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── SUBJECTS ───────────────────────── */}
      <section className="shell section">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="badge mx-auto">Explore topics</span>
          <h2 className="mt-5 text-balance font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
            Subjects we <span className="accent">cover</span>
          </h2>
          <p className="mt-4 text-ink-soft">
            From first phonics to 11+ preparation, plus clubs for children who
            want to keep going further.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUBJECTS.map((s, i) => (
            <Reveal key={s.name} delay={i * 70}>
              <Link
                href="/services"
                className="card card-hover group flex items-center gap-4 p-5"
              >
                <span className={`tile h-14 w-14 shrink-0 ${s.tile}`}>
                  <Icon name={s.icon} className="h-6 w-6" />
                </span>
                <span className="flex-1">
                  <span className="block font-display text-lg font-bold text-ink">
                    {s.name}
                  </span>
                  <span className="block text-sm text-ink-muted">{s.note}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-ink-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-coral" />
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────────────── MEET MS BETTY (spotlight) ───────────────────── */}
      <section className="shell pb-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-xl2 border border-line bg-surface shadow-card">
            <div className="bg-mesh pointer-events-none absolute inset-0 opacity-70" aria-hidden />
            <div className="relative grid gap-10 p-8 md:p-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div className="relative mx-auto w-full max-w-xs">
                <span
                  className="absolute inset-0 animate-pulse-ring rounded-full bg-coral/25"
                  aria-hidden
                />
                <Image
                  src="/images/betty-phonics.jpg"
                  alt="Ms Betty pointing to a phonics sound card during a lesson"
                  width={700}
                  height={700}
                  className="relative aspect-square w-full rounded-full object-cover shadow-pop"
                />
              </div>

              <div>
                <span className="badge">Expert guidance</span>
                <h2 className="mt-5 text-balance font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
                  Meet <span className="accent">{site.owner}</span>
                </h2>
                <p className="mt-4 max-w-measure leading-relaxed text-ink-soft">
                  &ldquo;I&rsquo;ve spent years walking alongside primary-aged
                  children as they learn to read, count and problem solve. What I
                  love most isn&rsquo;t just correct answers, it&rsquo;s the moment
                  a child realises they can do more than they think.&rdquo;
                </p>
                <p className="mt-4 font-display text-lg font-bold text-teal-deep">
                  {site.mission}
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/bookings" className="btn-primary">
                    Book with {site.owner}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/testimonials" className="btn-secondary">
                    Read kind words
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ───────────────────── SMALL GROUPS (real pupils) ───────────────────── */}
      <section className="shell pb-8 pt-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal dir="left">
            <span className="badge mb-4">Small groups</span>
            <h2 className="text-balance font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
              Learning together, <span className="accent">side by side</span>
            </h2>
            <p className="mt-4 max-w-measure leading-relaxed text-ink-soft">
              Groups stay small on purpose. Children hear each other think, share
              ideas and cheer each other on — and every child still gets time with
              Ms Betty in every session.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-ink-soft">
              {[
                'Friendly groups from £25 per week',
                'Age-appropriate session lengths, 30 to 50 minutes',
                'One-to-one available when a child needs it',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="tile mt-0.5 h-5 w-5 shrink-0 bg-tile-mint text-success">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal dir="right" delay={120}>
            <div className="grid grid-cols-2 gap-4">
              <Image
                src="/images/pupils-reading.jpg"
                alt="A teacher reading a story to a small group of primary-aged children"
                width={900}
                height={1100}
                className="col-span-2 aspect-[4/3] w-full rounded-xl2 object-cover shadow-lift"
              />
              <Image
                src="/images/pupils-group.jpg"
                alt="Young children taking part in a group music and phonics activity"
                width={700}
                height={700}
                className="aspect-square w-full rounded-card object-cover shadow-card"
              />
              <div className="grid place-items-center rounded-card bg-teal p-5 text-center text-white shadow-card">
                <div>
                  <div className="font-display text-3xl font-extrabold">
                    <CountUp to={7} />
                  </div>
                  <div className="mt-1 text-xs font-semibold text-white/85">
                    year groups, Reception to Year 6
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── WORD OF THE DAY ───────────────────────── */}
      <section className="shell pb-8 pt-8">
        <Reveal>
          <WordOfTheDay />
        </Reveal>
      </section>

      {/* ───────────────────────── RESOURCES ───────────────────────── */}
      <section className="shell section">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Reveal>
            <span className="badge">Resource hub</span>
            <h2 className="mt-5 text-balance font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
              Free guides to <span className="accent">start today</span>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <Link href="/resources" className="btn-secondary">
              Browse all resources
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {featured.map((p, i) => (
            <Reveal key={p.id} delay={i * 90}>
              <Link
                href={`/resources/${p.slug}`}
                className="card card-hover group flex h-full flex-col p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="tile h-12 w-12 bg-teal-tint text-teal">
                    <Icon name={styleFor(p).icon} className="h-5 w-5" />
                  </span>
                  <span className="pill bg-success-tint text-success">
                    {formatPrice(p.price_pence)}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-bold leading-snug text-ink">
                  {p.name}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                  {p.summary}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-coral">
                  Get it free
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────────────────── TESTIMONIALS ───────────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="shell section">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="badge mx-auto">Success stories</span>
            <h2 className="mt-5 text-balance font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
              What families <span className="accent">say</span>
            </h2>

            <div className="mt-7 flex items-center justify-center gap-2.5">
              <div className="flex gap-0.5" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 text-gold"
                    fill="currentColor"
                    aria-hidden
                  />
                ))}
              </div>
              <span className="font-display text-lg font-bold text-ink">
                <CountUp to={5} decimals={1} />
              </span>
              <span className="text-sm text-ink-muted">
                from {TESTIMONIALS.length} parent reviews
              </span>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.filter((t) => !t.feature)
              .slice(0, 3)
              .map((t, i) => (
                <Reveal key={t.topic} delay={i * 90}>
                  <figure className="card flex h-full flex-col p-6">
                    <div className="flex items-start justify-between gap-3">
                      <span className="badge">{t.topic}</span>
                      <Quote className="h-6 w-6 shrink-0 text-teal/25" aria-hidden />
                    </div>
                    <blockquote className="mt-4 flex-1 leading-relaxed text-ink">
                      <p>{t.quote}</p>
                    </blockquote>
                    <figcaption className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                      <span className="text-sm font-bold text-teal-deep">
                        {t.author}
                      </span>
                      <span className="flex gap-0.5" aria-label="5 out of 5 stars">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star
                            key={s}
                            className="h-3.5 w-3.5 text-gold"
                            fill="currentColor"
                            aria-hidden
                          />
                        ))}
                      </span>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
          </div>

          <Reveal className="mt-10 text-center">
            <Link href="/testimonials" className="btn-secondary">
              Read all kind words
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────────── FAQ ───────────────────────────── */}
      <section className="shell section">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <Reveal dir="left">
            <span className="badge">Have questions?</span>
            <h2 className="mt-5 text-balance font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
              Frequently asked <span className="accent">questions</span>
            </h2>
            <p className="mt-4 max-w-measure text-ink-soft">
              The practical bits, so you know exactly what to expect before your
              child&rsquo;s first session.
            </p>
            <div className="relative mt-8 hidden lg:block">
              <Image
                src="/images/betty-seated.jpg"
                alt="Ms Betty in her tutoring room"
                width={800}
                height={640}
                className="aspect-[5/4] w-full rounded-xl2 object-cover shadow-lift"
              />
            </div>
          </Reveal>

          <Reveal dir="right" delay={100} className="space-y-3">
            {FAQS.slice(0, 5).map((f) => (
              <details key={f.q} className="card group overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
                  <span className="flex-1 font-display text-base font-bold text-ink">
                    {f.q}
                  </span>
                  <span className="tile h-8 w-8 shrink-0 bg-surface-sunk text-teal transition-all duration-300 group-open:rotate-180 group-open:bg-coral group-open:text-white">
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  </span>
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-ink-soft">
                  {f.a}
                </p>
              </details>
            ))}
            <Link
              href="/faq"
              className="inline-flex items-center gap-1.5 px-1 pt-2 text-sm font-bold text-coral hover:text-coral-deep"
            >
              See all questions <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────────── CTA ───────────────────────────── */}
      <section className="shell pb-24">
        <Reveal dir="scale">
          <div className="relative overflow-hidden rounded-xl2 bg-teal p-10 text-center shadow-pop md:p-16">
            <div
              className="bg-dotgrid pointer-events-none absolute inset-0 opacity-[0.12]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-coral/25 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-gold/25 blur-3xl"
              aria-hidden
            />
            <Sparkle className="pointer-events-none absolute left-[12%] top-10 hidden h-5 w-5 text-white/50 md:block" />
            <Sparkle
              className="pointer-events-none absolute bottom-12 right-[14%] hidden h-4 w-4 text-white/40 md:block"
              delay={1200}
            />

            <div className="relative">
              <h2 className="text-balance font-display text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                Ready to see your child thrive?
              </h2>
              <p className="mx-auto mt-4 max-w-xl leading-relaxed text-white/85">
                Book a session or join the waiting list, and {site.owner} will get
                back to you within {site.contact.replyTime} with a plan that fits
                your child.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/bookings" className="btn-white group">
                  Book tuition
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/newsletter"
                  className="btn border border-white/35 text-white hover:bg-white/10"
                >
                  <Play className="h-4 w-4" />
                  Join the newsletter
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  )
}
