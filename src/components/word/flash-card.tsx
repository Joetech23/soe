'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, RotateCcw } from 'lucide-react'
import { splitSyllables, type WordEntry } from '@/lib/word-of-the-day'

/**
 * The flash card.
 *
 * This is the page's one bold idea, so everything around it stays quiet: it is
 * the object Ms Betty actually teaches with, sitting on the page as a physical
 * thing you can pick up and turn over. Front is the word; back is what it
 * means. The hard offset shadow does the physicality — no blur, so it reads as
 * card-on-table rather than as a web component with a drop shadow.
 *
 * Flipping is the interaction because it is the one the artefact already has.
 */
export function FlashCard({
  entry,
  dateLabel,
}: {
  entry: WordEntry
  dateLabel: string
}) {
  const [flipped, setFlipped] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [canSpeak, setCanSpeak] = useState(false)
  const liveRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    setCanSpeak(typeof window !== 'undefined' && 'speechSynthesis' in window)
  }, [])

  // A new day means a new word; don't leave yesterday's card turned over.
  useEffect(() => setFlipped(false), [entry.word])

  function say(text: string) {
    if (!canSpeak) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-GB'
    u.rate = 0.85 // slower than default: this is for a child sounding it out
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(u)
  }

  const syllables = splitSyllables(entry)

  return (
    <div className="wotd-stage">
      <div
        className={`wotd-card ${flipped ? 'is-flipped' : ''}`}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={
          flipped
            ? `${entry.word}. Showing the meaning. Activate to see the word.`
            : `${entry.word}. Activate to see what it means.`
        }
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setFlipped((f) => !f)
          }
        }}
      >
        <div className="wotd-face wotd-front">
          <div className="flex items-center justify-between gap-3">
            <span className="wotd-chip">Word of the day</span>
            <span className="text-[0.7rem] font-semibold uppercase tracking-widest text-white/70">
              {dateLabel}
            </span>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center py-2">
            <h2 className="wotd-word" style={{ fontSize: fitSize(entry.word) }}>
              {entry.word}
            </h2>

            {/* The beats you clap out — the thing every primary classroom does. */}
            <p className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
              {syllables.map((s, i) => (
                <span key={`${s}-${i}`} className="wotd-syllable">
                  {s}
                </span>
              ))}
            </p>

            <p className="mt-4 font-sans text-sm font-semibold italic text-white/80">
              {entry.partOfSpeech}
            </p>
          </div>

          <p className="text-center text-[0.7rem] font-bold uppercase tracking-widest text-white/60">
            Tap to turn it over
          </p>
        </div>

        <div className="wotd-face wotd-back">
          <span className="wotd-chip wotd-chip--dark">What it means</span>
          <p className="mt-3 font-display text-[1.35rem] font-bold leading-snug text-ink sm:text-2xl">
            {entry.definition}
          </p>

          <div className="mt-auto rounded-2xl bg-gold-tint p-4">
            <div className="text-[0.65rem] font-bold uppercase tracking-widest text-gold-deep">
              Try it in a sentence
            </div>
            <p className="mt-1 font-sans text-[0.95rem] italic leading-relaxed text-ink">
              &ldquo;{entry.example}&rdquo;
            </p>
          </div>

          <p className="mt-3 text-center text-[0.7rem] font-bold uppercase tracking-widest text-ink-muted">
            Tap to turn it back
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        {canSpeak && (
          <button
            type="button"
            onClick={() => say(entry.word)}
            className="wotd-action"
            aria-label={`Hear the word ${entry.word}`}
          >
            <Volume2 className={`h-4 w-4 ${speaking ? 'animate-pulse' : ''}`} aria-hidden />
            {speaking ? 'Listen…' : 'Hear it'}
          </button>
        )}
        {canSpeak && (
          <button
            type="button"
            onClick={() => say(syllables.join('. '))}
            className="wotd-action"
            aria-label={`Hear ${entry.word} syllable by syllable`}
          >
            <span className="font-mono text-xs font-bold" aria-hidden>
              {syllables.length}
            </span>
            Clap it out
          </button>
        )}
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="wotd-action"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          {flipped ? 'Show the word' : 'What does it mean?'}
        </button>
      </div>

      {/* Screen readers get the whole card without needing to flip it. */}
      <p ref={liveRef} className="sr-only">
        {entry.word}, {entry.partOfSpeech}. {entry.definition} Example: {entry.example}
      </p>
    </div>
  )
}

/** Long words have to shrink or they break out of the card. */
function fitSize(word: string): string {
  const n = word.length
  if (n <= 6) return 'clamp(3.2rem, 15vw, 5.5rem)'
  if (n <= 9) return 'clamp(2.6rem, 12vw, 4.4rem)'
  if (n <= 11) return 'clamp(2.1rem, 10vw, 3.6rem)'
  return 'clamp(1.8rem, 8.5vw, 3rem)'
}
