import { getCustomers } from '@/lib/admin/queries'
import { AdminPageHeader, Card } from '@/components/admin/ui'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Customers', robots: { index: false } }

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default async function AdminCustomers() {
  const customers = await getCustomers()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Customers"
        subtitle={`${customers.length} customer${customers.length === 1 ? '' : 's'}`}
      />

      <Card className="overflow-hidden">
        {customers.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-ink-muted">
              No customers yet. Anyone who downloads a free resource or buys a guide
              will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Account</th>
                  <th className="px-5 py-3">Marketing</th>
                  <th className="px-5 py-3">First seen</th>
                  <th className="px-5 py-3">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-line last:border-0 hover:bg-surface-sunk/50"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal text-sm font-bold text-white">
                          {(c.full_name ?? c.email).charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-ink">
                            {c.full_name ?? '—'}
                          </div>
                          <div className="truncate text-xs text-ink-muted">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {c.user_id ? (
                        <span className="pill bg-success-tint text-success">Registered</span>
                      ) : (
                        <span className="pill bg-surface-sunk text-ink-muted">Guest</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {c.marketing_consent ? (
                        <span className="pill bg-success-tint text-success">Opted in</span>
                      ) : (
                        <span className="pill bg-surface-sunk text-ink-muted">No</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted">
                      {shortDate(c.first_seen_at)}
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted">
                      {shortDate(c.last_seen_at)}
                    </td>
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
