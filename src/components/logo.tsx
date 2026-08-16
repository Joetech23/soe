import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { site } from '@/lib/site'

/**
 * Ms Betty's logo.
 *
 * The mark is a circular badge that already contains the wordmark and the
 * mission line, but at header sizes that text is far too small to read — so it
 * works as a recognisable shape and colour, and the adjacent text lockup does
 * the legibility work. Set `withWordmark={false}` anywhere the mark is large
 * enough to read on its own (footer, auth panels, end cards).
 */
export function LogoMark({
  size = 44,
  className,
  priority = false,
}: {
  size?: number
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src="/logo.png"
      alt={site.name}
      width={size}
      height={size}
      priority={priority}
      // The badge is round with transparent corners, so it needs no frame.
      className={cn('shrink-0 object-contain', className)}
      style={{ width: size, height: 'auto' }}
    />
  )
}

export function Logo({
  size = 44,
  withWordmark = true,
  href = '/',
  subtitle,
  className,
  priority = false,
}: {
  size?: number
  withWordmark?: boolean
  href?: string | null
  subtitle?: string
  className?: string
  priority?: boolean
}) {
  const inner = (
    <>
      <LogoMark size={size} priority={priority} />
      {withWordmark && (
        <span className="leading-tight">
          <span className="block font-display text-lg font-bold text-ink">
            {site.shortName}
          </span>
          <span className="block text-[0.7rem] text-ink-muted">
            {subtitle ?? site.tagline}
          </span>
        </span>
      )}
    </>
  )

  const classes = cn('flex items-center gap-2.5', className)

  if (!href) return <span className={classes}>{inner}</span>
  return (
    <Link href={href} className={classes} aria-label={site.name}>
      {inner}
    </Link>
  )
}
