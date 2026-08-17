import Link from 'next/link'
import {
  Banknote,
  ShoppingBag,
  Download,
  Mail,
  Plus,
  ArrowRight,
  Package,
  Users,
  Inbox,
} from 'lucide-react'
import { formatMoney, formatPrice } from '@/lib/utils'
import { site } from '@/lib/site'
import { getStats, getRecentOrders, getProductsWithSales } from '@/lib/admin/queries'
import { styleFor } from '@/lib/shop'
import { AdminPageHeader, StatCard, StatusPill, Card, SectionHead } from '@/components/admin/ui'
import { Icon } from '@/components/icon'
import type { OrderStatus } from '@/lib/admin/placeholder'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard', robots: { index: false } }

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Map the DB's order/payment status onto the UI pill vocabulary. */
function pillStatus(o: { status: string; payment_status: string; total_pence: number }): OrderStatus {
  if (o.payment_status === 'refunded' || o.payment_status === 'partially_refunded')
    return 'refunded'
  if (o.payment_status === 'paid') return o.total_pence === 0 ? 'free' : 'paid'
  return 'pending_payment'
}

const QUICK = [
  { href: '/admin/products', label: 'Add a product', icon: Package, tile: 'bg-tile-sky text-teal' },
  { href: '/admin/orders', label: 'View orders', icon: ShoppingBag, tile: 'bg-tile-rose text-coral' },
  { href: '/admin/enquiries', label: 'Enquiries', icon: Inbox, tile: 'bg-tile-amber text-gold-deep' },
  { href: '/admin/customers', label: 'Customers', icon: Users, tile: 'bg-tile-violet text-ink-soft' },
]

export default async function AdminDashboard() {
  const [stats, orders, products] = await Promise.all([
    getStats(),
    getRecentOrders(6),
    getProductsWithSales(),
  ])
  const topProducts = [...products].sort((a, b) => b.sales - a.sales).slice(0, 4)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Welcome back, ${site.owner}`}
        subtitle="Here's how your shop and tuition are doing this month."
        action={
          <Link href="/admin/products" className="btn-primary px-4 py-2.5">
            <Plus className="h-4 w-4" /> New product
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue this month"
          value={formatMoney(stats.revenuePence)}
          icon={Banknote}
          tile="bg-tile-mint text-success"
        />
        <StatCard
          label="Orders"
          value={String(stats.orders)}
          icon={ShoppingBag}
          tile="bg-tile-rose text-coral"
        />
        <StatCard
          label="Downloads"
          value={String(stats.downloads)}
          icon={Download}
          tile="bg-tile-sky text-teal"
        />
        <StatCard
          label="Newsletter subscribers"
          value={String(stats.subscribers)}
          icon={Mail}
          tile="bg-tile-amber text-gold-deep"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <SectionHead title="Recent orders" href="/admin/orders" />
          {orders.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">
              No orders yet. They&rsquo;ll appear here as soon as the shop goes live.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-line last:border-0 hover:bg-surface-sunk/50"
                    >
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-ink">
                        {o.order_number}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-ink">{o.customer_name}</div>
                        <div className="text-xs text-ink-muted">{o.customer_email}</div>
                      </td>
                      <td className="px-5 py-3 font-semibold text-ink">
                        {formatPrice(o.total_pence)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill status={pillStatus(o)} />
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{shortDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <SectionHead title="Top resources" href="/admin/products" linkLabel="Manage" />
          {topProducts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">
              No products yet.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {topProducts.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="tile h-10 w-10 bg-teal-tint text-teal">
                    <Icon name={styleFor(p).icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                    <div className="text-xs text-ink-muted">
                      {p.is_free ? 'Free' : formatPrice(p.price_pence)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-ink">{p.sales}</div>
                    <div className="text-[0.68rem] text-ink-muted">sales</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-ink">Quick actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK.map((q) => (
            <Link key={q.href} href={q.href} className="card card-hover flex items-center gap-3 p-4">
              <span className={`tile h-11 w-11 ${q.tile}`}>
                <q.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="flex-1 text-sm font-semibold text-ink">{q.label}</span>
              {q.href === '/admin/enquiries' && stats.enquiries > 0 && (
                <span className="rounded-pill bg-coral px-2 py-0.5 text-xs font-bold text-white">
                  {stats.enquiries}
                </span>
              )}
              <ArrowRight className="h-4 w-4 text-ink-muted" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
