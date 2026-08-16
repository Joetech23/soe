import { TICKER } from '@/lib/site'
import { Marquee, Sparkle } from '@/components/motion'

/**
 * Top ticker. Every line is factual copy from Ms Betty's own material — no
 * invented urgency. Decorative for screen readers: the same information lives
 * in the pages themselves.
 */
export function AnnouncementBar() {
  return (
    <div className="relative bg-ink text-white" aria-hidden>
      <Marquee className="marquee-mask py-2" speed="slow">
        {TICKER.map((t) => (
          <span
            key={t}
            className="flex items-center gap-3 whitespace-nowrap px-6 text-[0.78rem] font-medium tracking-wide text-white/85"
          >
            <Sparkle className="h-3 w-3 shrink-0 text-gold" />
            {t}
          </span>
        ))}
      </Marquee>
    </div>
  )
}
