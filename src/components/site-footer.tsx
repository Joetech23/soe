import Link from 'next/link'
import { MessageCircle, Mail } from 'lucide-react'
import { site, whatsappHref, mailHref } from '@/lib/site'
import { LogoMark } from '@/components/logo'

const exploreLinks = [
  { href: '/about', label: `About ${site.owner}` },
  { href: '/services', label: 'Tuition & year groups' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/resources', label: 'Resources hub' },
  { href: '/testimonials', label: 'Kind words' },
  { href: '/faq', label: 'FAQ' },
  { href: '/bookings', label: 'Book a session' },
  { href: '/newsletter', label: 'Newsletter' },
]

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-shell gap-10 px-4 py-16 md:grid-cols-3 md:px-8">
        <div>
          {/* Large enough here that the badge's own wordmark is legible, so no
              duplicate text lockup beside it. */}
          <LogoMark size={120} />
          <p className="mt-4 max-w-xs text-sm text-ink-muted">{site.delivery}</p>
        </div>

        <nav aria-label="Explore">
          <div className="eyebrow">Explore</div>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
            {exploreLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-coral">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <div className="eyebrow">Say hello</div>
          <ul className="mt-3 space-y-2.5 text-sm text-ink-soft">
            <li className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-teal" aria-hidden />
              <a href={whatsappHref} className="hover:text-coral">
                WhatsApp / text: {site.contact.whatsappDisplay}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-teal" aria-hidden />
              <a href={mailHref} className="hover:text-coral">
                {site.contact.email}
              </a>
            </li>
          </ul>
          <p className="mt-3 text-xs text-ink-muted">
            {site.owner} replies within {site.contact.replyTime}.
          </p>
        </div>
      </div>

      <div className="border-t border-line py-5 text-center text-xs text-ink-muted">
        © {new Date().getFullYear()} {site.name} · Made with care for young learners
      </div>
    </footer>
  )
}
