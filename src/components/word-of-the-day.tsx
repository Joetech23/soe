'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { getWordOfTheDay, type WordEntry } from '@/lib/word-of-the-day'

/**
 * Word of the day — a small vocabulary feature for primary families.
 * Computed on the client after mount so SSR/hydration always agree, and it
 * refreshes if the day rolls over while the tab is open.
 */
export function WordOfTheDay() {
  const [entry, setEntry] = useState<WordEntry | null>(null)

  useEffect(() => {
    setEntry(getWordOfTheDay())
  }, [])

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <section aria-label="Word of the day" className="card overflow-hidden">
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex items-center gap-3.5">
          <span className="tile h-12 w-12 bg-coral-tint text-coral">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <div className="eyebrow">Word of the day</div>
            <div className="text-sm text-ink-muted">{today}</div>
          </div>
        </div>

        {entry ? (
          <div className="md:text-right">
            <div className="font-display text-4xl font-semibold leading-none text-coral md:text-5xl">
              {entry.word}
            </div>
            <div className="mt-1 text-sm font-medium italic text-teal">
              {entry.partOfSpeech}
            </div>
          </div>
        ) : (
          <div className="h-12 w-40 animate-pulse rounded-xl bg-surface-sunk md:ml-auto" />
        )}
      </div>

      {entry && (
        <div className="grid animate-fade-in gap-px bg-line sm:grid-cols-2">
          <div className="bg-teal-tint/50 p-5 md:p-6">
            <div className="eyebrow">What it means</div>
            <p className="mt-1.5 text-base text-ink">{entry.definition}</p>
          </div>
          <div className="bg-gold-tint/50 p-5 md:p-6">
            <div className="eyebrow text-gold-deep">Try it in a sentence</div>
            <p className="mt-1.5 text-base italic text-ink">
              &ldquo;{entry.example}&rdquo;
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
