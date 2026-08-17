import Link from 'next/link'
import { Library, Receipt, GraduationCap, ArrowRight, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getLibrary, getMyOrders, getMyChildren } from '@/lib/account'
import { site } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'My account', robots: { index: false } }

export default async function AccountOverview() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [library, orders, children] = await Promise.all([
    getLibrary(),
    getMyOrders(),
    getMyChildren(),
  ])

  // Prefer the name they gave at sign-up. The email local part was a stand-in
  // from before the form collected a name, and it produced greetings like
  // "Hello, soetuition".
  const fullName =
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.trim()
      : ''
  const firstName =
    fullName.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  const cards = [
    {
      href: '/account/library',
      icon: Library,
      tile: 'bg-tile-sky text-teal',
      label: 'Resources in your library',
      value: String(library.length),
    },
    {
      href: '/account/orders',
      icon: Receipt,
      tile: 'bg-tile-rose text-coral',
      label: 'Orders placed',
      value: String(orders.length),
    },
    {
      href: '/account/child',
      icon: GraduationCap,
      tile: 'bg-tile-amber text-gold-deep',
      label: children.length ? 'Children linked' : 'No child linked yet',
      value: String(children.length),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">
          Hello, {firstName}
        </h1>
        <p className="mt-1 text-ink-soft">
          Everything you&rsquo;ve downloaded from {site.owner}, in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card card-hover p-5">
            <span className={`tile h-11 w-11 ${c.tile}`}>
              <c.icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="mt-4 font-display text-3xl font-bold text-ink">{c.value}</div>
            <div className="mt-0.5 text-sm text-ink-muted">{c.label}</div>
          </Link>
        ))}
      </div>

      {library.length === 0 && (
        <div className="card p-8 text-center">
          <span className="tile mx-auto mb-4 h-12 w-12 bg-teal-tint text-teal">
            <Sparkles className="h-6 w-6" aria-hidden />
          </span>
          <h2 className="font-display text-lg font-bold text-ink">
            Your library is empty
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            Several of Ms Betty&rsquo;s guides are completely free — grab one and
            it will appear here straight away.
          </p>
          <Link href="/resources" className="btn-primary mt-6">
            Browse resources <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
