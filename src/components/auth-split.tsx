import Link from 'next/link'
import Image from 'next/image'
import { Check } from 'lucide-react'
import { site } from '@/lib/site'
import { Sparkle } from '@/components/motion'
import { LogoMark } from '@/components/logo'

/**
 * Split-screen auth shell: form on the left, brand panel on the right.
 * The panel collapses away below `lg` so phones get a clean single column.
 */
export function AuthSplit({
  children,
  title,
  subtitle,
  panel = 'customer',
}: {
  children: React.ReactNode
  title: string
  subtitle: string
  panel?: 'customer' | 'admin'
}) {
  const points =
    panel === 'admin'
      ? [
          'Orders, downloads and customers at a glance',
          'Add resources and upload files securely',
          'Manage groups, homework and lesson feedback',
        ]
      : [
          'Every guide you download, kept forever',
          'Re-download on any device, any time',
          "Your child's homework and lesson notes",
        ]

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col justify-center px-5 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label={site.name}>
            <LogoMark size={52} priority />
            <span className="font-display text-lg font-bold text-ink">
              {site.shortName}
            </span>
          </Link>

          <h1 className="mt-9 font-display text-3xl font-bold tracking-tight text-ink">
            {title}
          </h1>
          <p className="mt-2 text-ink-soft">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <p className="mt-10 text-center text-xs text-ink-muted">
            <Link href="/" className="hover:text-teal">
              ← Back to the website
            </Link>
          </p>
        </div>
      </div>

      {/* Brand side */}
      <div className="relative hidden overflow-hidden bg-teal lg:block">
        <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden />
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-coral/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-gold/25 blur-3xl"
          aria-hidden
        />
        <Sparkle className="pointer-events-none absolute right-24 top-16 h-6 w-6 text-white/40" />
        <Sparkle
          className="pointer-events-none absolute bottom-28 right-1/3 h-4 w-4 text-white/30"
          delay={1100}
        />

        <div className="relative flex h-full flex-col justify-center px-14 xl:px-20">
          <blockquote className="font-display text-3xl font-bold leading-snug text-white xl:text-4xl">
            &ldquo;{site.mission}&rdquo;
          </blockquote>
          <p className="mt-4 text-white/80">— {site.owner}</p>

          <ul className="mt-10 space-y-3.5">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-white/90">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/20">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                {p}
              </li>
            ))}
          </ul>

          <div className="mt-12 flex items-center gap-4">
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-[3px] ring-white/25">
              <Image
                src="/images/betty-portrait.jpg"
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            </span>
            <p className="text-sm text-white/80">
              Taught by {site.owner} · Reception to Year 6
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
