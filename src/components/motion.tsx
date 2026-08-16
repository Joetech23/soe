'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  useInView — shared observer with a fail-safe.                             */
/*  Background tabs freeze IntersectionObserver and rAF, so a timer reveals    */
/*  content regardless. Reduced-motion users skip straight to visible.         */
/* -------------------------------------------------------------------------- */
function useInView<T extends HTMLElement>(failSafeMs = 1400) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    )
    io.observe(el)
    const t = window.setTimeout(() => setInView(true), failSafeMs)
    return () => {
      io.disconnect()
      window.clearTimeout(t)
    }
  }, [failSafeMs])

  return { ref, inView }
}

/* -------------------------------------------------------------------------- */
/*  Reveal — fade + slide + de-blur on scroll.                                */
/* -------------------------------------------------------------------------- */
export function Reveal({
  children,
  className,
  delay = 0,
  dir = 'up',
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  dir?: 'up' | 'left' | 'right' | 'scale'
  as?: 'div' | 'section' | 'li' | 'article' | 'span'
}) {
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <Tag
      ref={ref as React.RefObject<never>}
      data-dir={dir}
      className={cn(inView ? 'reveal-in' : 'reveal-init', className)}
      style={{ transitionDelay: inView ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  )
}

/* -------------------------------------------------------------------------- */
/*  Stagger — reveals children one after another.                             */
/* -------------------------------------------------------------------------- */
export function Stagger({
  children,
  className,
  step = 90,
  start = 0,
  dir = 'up',
}: {
  children: ReactNode[]
  className?: string
  step?: number
  start?: number
  dir?: 'up' | 'left' | 'right' | 'scale'
}) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <Reveal key={i} delay={start + i * step} dir={dir}>
          {child}
        </Reveal>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  CountUp — animates a number into view. Eased, rAF-driven.                 */
/* -------------------------------------------------------------------------- */
export function CountUp({
  to,
  decimals = 0,
  duration = 1600,
  suffix = '',
  prefix = '',
  className,
}: {
  to: number
  decimals?: number
  duration?: number
  suffix?: string
  prefix?: string
  className?: string
}) {
  const { ref, inView } = useInView<HTMLSpanElement>()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(to)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      // easeOutExpo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      setValue(to * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // Fail-safe: if rAF is throttled to a halt, land on the final value.
    const t = window.setTimeout(() => setValue(to), duration + 600)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
    }
  }, [inView, to, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  Marquee — seamless infinite scroll. Children are duplicated once.          */
/* -------------------------------------------------------------------------- */
export function Marquee({
  children,
  speed = 'normal',
  reverse = false,
  pauseOnHover = true,
  className,
}: {
  children: ReactNode
  speed?: 'normal' | 'slow'
  reverse?: boolean
  pauseOnHover?: boolean
  className?: string
}) {
  const anim = reverse
    ? 'animate-marquee-rev'
    : speed === 'slow'
      ? 'animate-marquee-slow'
      : 'animate-marquee'
  return (
    <div className={cn('overflow-hidden', className)}>
      <div
        className={cn(
          'marquee-track',
          anim,
          pauseOnHover && 'hover:[animation-play-state:paused]'
        )}
      >
        <div className="flex shrink-0 items-center" aria-hidden={false}>
          {children}
        </div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Spotlight — cursor-following glow. Pure CSS vars, no re-renders.          */
/* -------------------------------------------------------------------------- */
export function Spotlight({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    <div ref={ref} onMouseMove={onMove} className={cn('spotlight', className)}>
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  ScrollProgress — thin brand-coloured bar across the top of the page.      */
/* -------------------------------------------------------------------------- */
export function ScrollProgress() {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const h = document.documentElement
        const max = h.scrollHeight - h.clientHeight
        setPct(max > 0 ? (h.scrollTop / max) * 100 : 0)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-transparent"
      aria-hidden
    >
      <div
        className="h-full origin-left bg-gradient-to-r from-coral via-gold to-teal transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  TypeWriter — types a word, holds, deletes, moves to the next.             */
/*                                                                            */
/*  The longest word is rendered invisibly underneath so the line never        */
/*  reflows mid-animation — otherwise the whole headline jumps on every        */
/*  character. Reduced-motion users get the first word, statically.            */
/* -------------------------------------------------------------------------- */
export function TypeWriter({
  words,
  className,
  typeMs = 85,
  deleteMs = 45,
  holdMs = 1700,
}: {
  words: string[]
  className?: string
  typeMs?: number
  deleteMs?: number
  holdMs?: number
}) {
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<'typing' | 'holding' | 'deleting'>('typing')
  const [still, setStill] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true)
      setText(words[0] ?? '')
    }
  }, [words])

  useEffect(() => {
    if (still) return
    const word = words[index % words.length] ?? ''
    let t: number

    if (phase === 'typing') {
      if (text.length < word.length) {
        t = window.setTimeout(() => setText(word.slice(0, text.length + 1)), typeMs)
      } else {
        t = window.setTimeout(() => setPhase('holding'), holdMs)
      }
    } else if (phase === 'holding') {
      t = window.setTimeout(() => setPhase('deleting'), 120)
    } else {
      if (text.length > 0) {
        t = window.setTimeout(() => setText(word.slice(0, text.length - 1)), deleteMs)
      } else {
        setIndex((i) => (i + 1) % words.length)
        setPhase('typing')
        return
      }
    }
    return () => window.clearTimeout(t)
  }, [text, phase, index, words, typeMs, deleteMs, holdMs, still])

  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '')

  return (
    <span className={cn('relative inline-grid', className)}>
      {/* Reserves the width of the longest word so nothing reflows. */}
      <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre">
        {longest}
      </span>
      <span className="col-start-1 row-start-1 whitespace-pre text-left">
        {text}
        {!still && (
          <span
            aria-hidden
            className="ml-0.5 inline-block w-[0.06em] animate-pulse bg-current align-baseline"
            style={{ height: '0.82em', verticalAlign: '-0.06em' }}
          />
        )}
      </span>
      {/* Screen readers get the full list once, not a stream of partial words. */}
      <span className="sr-only">{words.join(', ')}</span>
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sparkle — the decorative asterisk from the reference, gently twinkling.   */
/* -------------------------------------------------------------------------- */
export function Sparkle({
  className,
  delay = 0,
}: {
  className?: string
  delay?: number
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('animate-twinkle', className)}
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden
      fill="currentColor"
    >
      <path d="M12 0c.5 6.2 5.3 11 11.5 11.5C17.3 12 12.5 16.8 12 23c-.5-6.2-5.3-11-11.5-11.5C6.7 11 11.5 6.2 12 0z" />
    </svg>
  )
}
