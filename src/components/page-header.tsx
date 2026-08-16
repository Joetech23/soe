import { cn } from '@/lib/utils'
import { Reveal } from '@/components/reveal'

/**
 * Page hero. Clean, confident display title with a pill eyebrow — no
 * decorative rules. Gains a soft coral underline accent under the first line
 * for a touch of brand warmth.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  align = 'left',
  children,
}: {
  eyebrow?: string
  title: React.ReactNode
  lede?: React.ReactNode
  align?: 'left' | 'center'
  children?: React.ReactNode
}) {
  return (
    <Reveal
      className={cn('max-w-measure', align === 'center' && 'mx-auto text-center')}
    >
      {eyebrow && (
        <span className={cn('badge mb-4', align === 'center' && 'mx-auto')}>
          {eyebrow}
        </span>
      )}
      <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl md:text-[3.4rem]">
        {title}
      </h1>
      {lede && (
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">{lede}</p>
      )}
      {children}
    </Reveal>
  )
}
