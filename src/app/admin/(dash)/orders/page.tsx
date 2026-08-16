import { formatPrice } from '@/lib/utils'
import { getAllOrders } from '@/lib/admin/queries'
import { AdminPageHeader, Card, StatusPill } from '@/components/admin/ui'
import type { OrderStatus } from '@/lib/admin/placeholder'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Orders', robots: { index: false } }

function longDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function pillStatus(o: {
  payment_status: string
  total_pence: number
}): OrderStatus {
  if (o.payment_status === 'refunded' || o.payment_status === 'partially_refunded')
    return 'refunded'
  if (o.payment_status === 'paid') return o.total_pence === 0 ? 'free' : 'paid'
  return 'pending_payment'
}

export default async function AdminOrders() {
  const orders = await getAllOrders()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Orders"
        subtitle={`${orders.length} order${orders.length === 1 ? '' : 's'}`}
      />

      <Card className="overflow-hidden">
        {orders.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-ink-muted">
              No orders yet. They&rsquo;ll appear here the moment the shop takes its
              first payment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Provider</th>
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
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-ink">
                      {o.order_number}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-ink">{o.customer_name}</div>
                      <div className="text-xs text-ink-muted">{o.customer_email}</div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-ink">
                      {formatPrice(o.total_pence)}
                    </td>
                    <td className="px-5 py-3.5 capitalize text-ink-soft">
                      {o.payment_provider === 'none' ? '—' : o.payment_provider}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusPill status={pillStatus(o)} />
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted">{longDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
