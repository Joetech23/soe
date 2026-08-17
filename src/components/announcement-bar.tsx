import { Megaphone } from 'lucide-react'
import { TICKER } from '@/lib/site'
import { Marquee, Sparkle } from '@/components/motion'
import { getSettings } from '@/lib/settings'

/**
 * Top bar.
 *
 * Two modes, never both: an announcement Ms Betty has written in the admin
 * settings, or the standing ticker. Stacking them would put two dark bars above
 * the header and make the announcement — the thing that is actually new —
 * compete with permanent copy for attention.
 *
 * The ticker is `aria-hidden` because it only repeats facts that appear in the
 * pages themselves. A real announcement is not, since it may be the only place
 * that information exists.
 */
export async function AnnouncementBar() {
  const { announcementEnabled, announcementText } = await getSettings()
  const announcement = announcementEnabled ? announcementText.trim() : ''

  if (announcement) {
    return (
      <div className="relative bg-ink text-white" role="status">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2.5 px-5 py-2.5 text-center">
          <Megaphone className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
          <p className="text-[0.8rem] font-semibold tracking-wide text-white">
            {announcement}
          </p>
        </div>
      </div>
    )
  }

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
