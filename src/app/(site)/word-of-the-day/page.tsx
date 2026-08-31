import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import {
  getWordForDay,
  londonToday,
  londonFormat,
  isValidDay,
  addDays,
  recentDays,
  WORDS,
} from '@/lib/word-of-the-day'
import { siteUrl } from '@/lib/utils'
import { site } from '@/lib/site'
import { Reveal } from '@/components/motion'
import { FlashCard } from '@/components/word/flash-card'
import { ShareTools } from '@/components/word/share-tools'

export const revalidate = 3600

type Props = { searchParams: { day?: string } }

/** The day being shown: a valid ?day=, else today in London. */
function resolveDay(searchParams: Props['searchParams']): string {
  const asked = searchParams.day
  if (asked && isValidDay(asked)) return asked
  return londonToday()
}

export function generateMetadata({ searchParams }: Props): Metadata {
  const day = resolveDay(searchParams)
  const entry = getWordForDay(day)
  const isToday = day === londonToday()
  const nice = londonFormat(day, { day: 'numeric', month: 'long', year: 'numeric' })

  const title = isToday
    ? `Word of the day: ${entry.word}`
    : `${entry.word} — word of the day, ${nice}`
  const description = `${entry.word} (${entry.partOfSpeech}): ${entry.definition} A new word every day for primary families, from ${site.owner}.`

  // Only today's view is canonical; archive days point back to it so the
  // rotating content cannot fragment into hundreds of thin pages.
  const canonical = siteUrl('/word-of-the-day')

  return {
    title,
    description,
    alternates: { canonical },
    robots: isToday ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function WordOfTheDayPage({ searchParams }: Props) {
  const today = londonToday()
  const day = resolveDay(searchParams)
  if (searchParams.day && !isValidDay(searchParams.day)) notFound()

  const entry = getWordForDay(day)
  const isToday = day === today
  const week = recentDays(today, 7)
  const dateLabel = londonFormat(day)
  const shortLabel = londonFormat(day, { day: 'numeric', month: 'short' })

  const prev = addDays(day, -1)
  const next = addDays(day, 1)
  const canGoNext = next <= today

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: entry.word,
    description: entry.definition,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'Word of the day',
      url: siteUrl('/word-of-the-day'),
    },
  }

  return (
    <div className="shell section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero: the word is the headline ───────────────────────────────── */}
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="badge mx-auto">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {isToday ? 'Today' : shortLabel}
        </span>
        <h1 className="mt-5 text-balance font-display text-4xl font-extrabold tracking-tight text-ink md:text-6xl">
          {isToday ? 'Today’s word is' : 'The word was'}{' '}
          <span className="accent">{entry.word}</span>
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          One good word a day. Read it, hear it, use it at teatime.
        </p>
      </Reveal>

      {/* ── The card ─────────────────────────────────────────────────────── */}
      <Reveal className="mt-14" dir="scale">
        <FlashCard entry={entry} dateLabel={shortLabel} />
      </Reveal>

      {/* ── Day-to-day ───────────────────────────────────────────────────── */}
      <Reveal className="mt-12 flex items-center justify-center gap-2">
        <Link
          href={`/word-of-the-day?day=${prev}`}
          className="wotd-action"
          aria-label="See the day before"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Yesterday
        </Link>
        {!isToday && (
          <Link href="/word-of-the-day" className="wotd-action">
            Back to today
          </Link>
        )}
        {canGoNext && !isToday && (
          <Link
            href={`/word-of-the-day?day=${next}`}
            className="wotd-action"
            aria-label="See the next day"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </Reveal>

      {/* ── Share ────────────────────────────────────────────────────────── */}
      <Reveal className="mt-24">
        <ShareTools
          entry={entry}
          day={day}
          dateLabel={dateLabel}
          shareUrl={siteUrl(isToday ? '/word-of-the-day' : `/word-of-the-day?day=${day}`)}
        />
      </Reveal>

      {/* ── The week ─────────────────────────────────────────────────────── */}
      <Reveal className="mt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            This week&rsquo;s words
          </h2>
          <p className="text-sm text-ink-muted">
            {WORDS.length} words in the collection
          </p>
        </div>

        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {week.map((d) => {
            const w = getWordForDay(d)
            const active = d === day
            return (
              <li key={d}>
                <Link
                  href={d === today ? '/word-of-the-day' : `/word-of-the-day?day=${d}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-full flex-col rounded-2xl border-2 p-3.5 transition-all ${
                    active
                      ? 'border-ink bg-ink text-white shadow-[4px_4px_0_0_theme(colors.coral.DEFAULT)]'
                      : 'border-line bg-surface hover:-translate-y-0.5 hover:border-ink'
                  }`}
                >
                  <span
                    className={`text-[0.65rem] font-bold uppercase tracking-widest ${
                      active ? 'text-white/70' : 'text-ink-muted'
                    }`}
                  >
                    {londonFormat(d, { weekday: 'short' })}
                  </span>
                  <span
                    className={`mt-1 font-display text-lg font-bold leading-tight ${
                      active ? 'text-white' : 'text-ink'
                    }`}
                  >
                    {w.word}
                  </span>
                  {d === today && (
                    <span
                      className={`mt-auto pt-2 text-[0.6rem] font-bold uppercase tracking-widest ${
                        active ? 'text-gold' : 'text-coral'
                      }`}
                    >
                      Today
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </Reveal>

      {/* ── How to use it ────────────────────────────────────────────────── */}
      <Reveal className="mt-24">
        <div className="rounded-card border border-line bg-surface p-7 md:p-10">
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
            Three minutes at the kitchen table
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {[
              {
                n: 'Read it',
                b: 'Say the word together, then break it into the chunks on the card.',
              },
              {
                n: 'Mean it',
                b: 'Turn the card over. Can your child explain it back in their own words?',
              },
              {
                n: 'Use it',
                b: 'Challenge them to slip it into conversation before bedtime.',
              },
            ].map((s, i) => (
              <div key={s.n}>
                {/* Numbered because these genuinely run in order. */}
                <span className="font-display text-sm font-bold text-coral">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-1 font-display text-lg font-bold text-ink">{s.n}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <Reveal className="mt-20 text-center">
        <h2 className="font-display text-3xl font-bold text-ink">
          Vocabulary grows fastest in conversation.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          That is most of what happens in a session with {site.owner} — reading,
          talking, and noticing words together.
        </p>
        <Link href="/bookings" className="btn-primary mt-6">
          Book a session <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Reveal>
    </div>
  )
}
