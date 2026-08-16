import Link from 'next/link'
import { Receipt, ArrowRight } from 'lucide-react'
import { getMyOrders } from '@/lib/account'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'My orders', robots: { index: false } }

export default async function OrdersPage() {
  const orders = await getMyOrders()

  if (orders.length === 0) {
    return (
      <div className="card p-10 text-center">
        <span className="tile mx-auto mb-4 h-12 w-12 bg-teal-tint text-teal">
          <Receipt className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="font-display text-xl font-bold text-ink">No orders yet</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
          Your receipts will appear here.
        </p>
        <Link href="/resources" className="btn-primary mt-6">
          Browse resources <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">Orders</h1>
        <p className="mt-1 text-ink-soft">{orders.length} order{orders.length === 1 ? '' : 's'}</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-ink">
                    {o.order_number}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-ink">
                    {formatPrice(o.total_pence)}
                  </td>
                  <td className="px-5 py-3.5">
                    {o.payment_status === 'paid' ? (
                      <span className="pill bg-success-tint text-success">
                        {o.total_pence === 0 ? 'Free' : 'Paid'}
                      </span>
                    ) : o.payment_status === 'refunded' ? (
                      <span className="pill bg-surface-sunk text-ink-muted">Refunded</span>
                    ) : (
                      <span className="pill bg-warn-tint text-warn">Awaiting payment</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-ink-muted">
                    {new Date(o.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm text-ink-muted">
        Files from any paid order live in{' '}
        <Link href="/account/library" className="font-semibold text-coral hover:underline">
          your library
        </Link>
        .
      </p>
    </div>
  )
}
