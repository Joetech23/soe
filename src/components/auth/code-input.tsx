'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Segmented one-time-code entry.
 *
 * Built rather than borrowed because the fiddly parts are exactly the parts a
 * parent hits on a phone: pasting the whole code from the email app must fill
 * every box, backspace on an empty box must step back, and a complete code
 * should submit itself rather than asking for one more tap.
 *
 * Supabase mints 8-digit codes, hence the default length.
 */
export function CodeInput({
  length = 8,
  onComplete,
  disabled,
  value,
  onChange,
}: {
  length?: number
  onComplete?: (code: string) => void
  disabled?: boolean
  value: string
  onChange: (code: string) => void
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const [focused, setFocused] = useState<number | null>(null)
  const digits = value.padEnd(length, ' ').slice(0, length).split('')

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  // Fire once the code is full. Guarded on length so an edit in the middle of a
  // complete code does not resubmit on every keystroke.
  const fired = useRef('')
  useEffect(() => {
    if (value.length === length && fired.current !== value) {
      fired.current = value
      onComplete?.(value)
    }
    if (value.length < length) fired.current = ''
  }, [value, length, onComplete])

  function set(next: string) {
    onChange(next.replace(/\D/g, '').slice(0, length))
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (value[i]) {
        set(value.slice(0, i) + value.slice(i + 1))
        refs.current[i]?.focus()
      } else if (i > 0) {
        set(value.slice(0, i - 1) + value.slice(i))
        refs.current[i - 1]?.focus()
      }
      return
    }
    if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault()
      refs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && i < length - 1) {
      e.preventDefault()
      refs.current[i + 1]?.focus()
    }
  }

  function handleChange(i: number, raw: string) {
    const typed = raw.replace(/\D/g, '')
    if (!typed) return
    // A paste lands here too — spread it across the remaining boxes.
    const merged = (value.slice(0, i) + typed).slice(0, length)
    set(merged)
    const nextIdx = Math.min(merged.length, length - 1)
    refs.current[nextIdx]?.focus()
  }

  return (
    <div
      className="flex justify-between gap-1.5 sm:gap-2"
      role="group"
      aria-label={`${length}-digit code from your email`}
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          disabled={disabled}
          value={d.trim()}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onFocus={(e) => {
            setFocused(i)
            e.target.select()
          }}
          onBlur={() => setFocused(null)}
          className={[
            'h-13 w-full min-w-0 rounded-xl border bg-surface text-center font-display text-xl font-bold text-ink',
            'py-3 transition-all duration-150 focus:outline-none disabled:opacity-50',
            focused === i
              ? 'border-teal ring-2 ring-teal/25 scale-[1.04]'
              : d.trim()
                ? 'border-teal/45'
                : 'border-line',
          ].join(' ')}
        />
      ))}
    </div>
  )
}
