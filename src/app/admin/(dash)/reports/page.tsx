import {
  Banknote,
  ShoppingBag,
  Download,
  Mail,
  Inbox,
  Users,
  GraduationCap,
  FileText,
} from 'lucide-react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { formatMoney } from '@/lib/utils'
import { AdminPageHeader, Card, SectionHead, StatCard } from '@/components/admin/ui'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Reports', robots: { index: false } }

type MonthRow = { month: string; orders: number; pence: number }

export default async function AdminReports() {
  let revenueAll = 0
  let revenueMonth = 0
  let orderCount = 0
  let paidCount = 0
  let downloads = 0
  let subs = 0
  let enquiries = 0
  let childCount = 0
  let linkedParents = 0
  let homeworkCount = 0
  let months: MonthRow[] = []
  let topProducts: { name: string; sales: number }[] = []

  if (hasAdminCredentials()) {
    const db = createAdminClient()
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [orders, items, dl, sb, enq, kids, hw] = await Promise.all([
      db.from('orders').select('total_pence, payment_status, paid_at, created_at'),
      db.from('order_items').select('product_name'),
      db.from('download_events').select('id', { count: 'exact', head: true }),
      db
        .from('newsletter_subscribers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'confirmed'),
      db.from('booking_requests').select('status'),
      db.from('children').select('parent_user_id'),
      db.from('homework_items').select('id', { count: 'exact', head: true }),
    ])

    const rows = (orders.data ?? []) as {
      total_pence: number
      payment_status: string
      paid_at: string | null
      created_at: string
    }[]
    orderCount = rows.length
    const paid = rows.filter((o) => o.payment_status === 'paid')
    paidCount = paid.length
    revenueAll = paid.reduce((s, o) => s + o.total_pence, 0)
    revenueMonth = paid
      .filter((o) => o.paid_at && new Date(o.paid_at) >= monthStart)
      .reduce((s, o) => s + o.total_pence, 0)

    // Last six months of paid orders
    const buckets = new Map<string, { orders: number; pence: number }>()
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      buckets.set(
        d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
        { orders: 0, pence: 0 }
      )
    }
    for (const o of paid) {
      if (!o.paid_at) continue
      const key = new Date(o.paid_at).toLocaleDateString('en-GB', {
        month: 'short',
        year: '2-digit',
      })
      const b = buckets.get(key)
      if (b) {
        b.orders += 1
        b.pence += o.total_pence
      }
    }
    months = [...buckets.entries()].map(([month, v]) => ({ month, ...v }))

    const tally = new Map<string, number>()
    for (const it of (items.data ?? []) as { product_name: string }[]) {
      tally.set(it.product_name, (tally.get(it.product_name) ?? 0) + 1)
    }
    topProducts = [...tally.entries()]
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 6)

    downloads = dl.count ?? 0
    subs = sb.count ?? 0
    enquiries = ((enq.data ?? []) as { status: string }[]).filter(
      (e) => e.status === 'new'
    ).length
    const kidRows = (kids.data ?? []) as { parent_user_id: string | null }[]
    childCount = kidRows.length
    linkedParents = kidRows.filter((k) => k.parent_user_id).length
    homeworkCount = hw.count ?? 0
  }

  const peak = Math.max(1, ...months.map((m) => m.pence))

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reports"
        subtitle="Everything at a glance — shop and tuition."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue this month"
          value={formatMoney(revenueMonth)}
          icon={Banknote}
          tile="bg-tile-mint text-success"
        />
        <StatCard
          label="Revenue all time"
          value={formatMoney(revenueAll)}
          icon={Banknote}
          tile="bg-tile-amber text-gold-deep"
        />
        <StatCard
          label="Paid orders"
          value={`${paidCount} of ${orderCount}`}
          icon={ShoppingBag}
          tile="bg-tile-rose text-coral"
        />
        <StatCard
          label="File downloads"
          value={String(downloads)}
          icon={Download}
          tile="bg-tile-sky text-teal"
        />
      </div>

      <Card>
        <SectionHead title="Paid orders, last six months" />
        {months.every((m) => m.pence === 0) ? (
          <p className="px-5 py-12 text-center text-sm text-ink-muted">
            No paid orders yet. This chart fills in once the shop takes its first
            payment.
          </p>
        ) : (
          <div className="p-5">
            <div className="flex items-end gap-3" style={{ height: '11rem' }}>
              {months.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-teal transition-all"
                      style={{ height: `${Math.max(3, (m.pence / peak) * 100)}%` }}
                      title={`${m.month}: ${formatMoney(m.pence)} from ${m.orders} order(s)`}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-ink">
                      {formatMoney(m.pence)}
                    </div>
                    <div className="text-[0.68rem] text-ink-muted">{m.month}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionHead title="Most popular resources" href="/admin/products" linkLabel="Manage" />
          {topProducts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">
              No sales yet.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {topProducts.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <span className="min-w-0 truncate text-sm text-ink">{p.name}</span>
                  <span className="shrink-0 text-sm font-bold text-ink">{p.sales}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHead title="Tuition & audience" />
          <ul className="divide-y divide-line">
            {[
              {
                icon: GraduationCap,
                tile: 'bg-tile-sky text-teal',
                label: 'Children on the register',
                value: String(childCount),
                href: '/admin/children',
              },
              {
                icon: Users,
                tile: 'bg-tile-mint text-success',
                label: 'Parents linked to a child',
                value: `${linkedParents} of ${childCount}`,
                href: '/admin/children',
              },
              {
                icon: FileText,
                tile: 'bg-tile-violet text-ink-soft',
                label: 'Homework posted',
                value: String(homeworkCount),
                href: '/admin/homework',
              },
              {
                icon: Mail,
                tile: 'bg-tile-amber text-gold-deep',
                label: 'Confirmed subscribers',
                value: String(subs),
                href: '/admin/subscribers',
              },
              {
                icon: Inbox,
                tile: 'bg-tile-rose text-coral',
                label: 'New enquiries',
                value: String(enquiries),
                href: '/admin/enquiries',
              },
            ].map((r) => (
              <li key={r.label} className="flex items-center gap-3 px-5 py-3.5">
                <span className={`tile h-9 w-9 shrink-0 ${r.tile}`}>
                  <r.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="flex-1 text-sm text-ink-soft">{r.label}</span>
                <span className="font-display text-lg font-bold text-ink">
                  {r.value}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
