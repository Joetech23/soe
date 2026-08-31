import Link from 'next/link'
import { ReceiptText, Clock, CheckCircle2, PoundSterling } from 'lucide-react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { AdminPageHeader, Card, SectionHead, StatCard } from '@/components/admin/ui'
import { InvoiceActions } from '@/components/admin/enquiry-forms'
import { INVOICE_STATUS_LABELS } from '@/lib/invoices'
import { formatMoney } from '@/lib/utils'
import type { InvoiceRow, InvoiceStatus } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Invoices', robots: { index: false } }

function when(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STYLE: Record<InvoiceStatus, string> = {
  draft: 'bg-surface-sunk text-ink-muted',
  sent: 'bg-warn-tint text-warn',
  paid: 'bg-success-tint text-success',
  void: 'bg-surface-sunk text-ink-muted',
}

export default async function AdminInvoices() {
  let rows: InvoiceRow[] = []
  let tableMissing = false

  if (hasAdminCredentials()) {
    const { data, error } = await createAdminClient()
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) tableMissing = /does not exist|schema cache/i.test(error.message)
    rows = (data ?? []) as InvoiceRow[]
  }

  const outstanding = rows.filter((r) => r.status === 'sent')
  const paid = rows.filter((r) => r.status === 'paid')

  // "This month" by payment date, not creation date — it is a takings figure.
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const thisMonth = paid
    .filter((r) => r.paid_at && new Date(r.paid_at) >= monthStart)
    .reduce((sum, r) => sum + r.total_pence, 0)

  const groups: { title: string; items: InvoiceRow[]; empty: string }[] = [
    {
      title: `Awaiting payment (${outstanding.length})`,
      items: outstanding,
      empty: 'Nothing outstanding.',
    },
    {
      title: `Drafts (${rows.filter((r) => r.status === 'draft').length})`,
      items: rows.filter((r) => r.status === 'draft'),
      empty: 'No drafts.',
    },
    { title: `Paid (${paid.length})`, items: paid, empty: 'No payments yet.' },
    {
      title: `Cancelled (${rows.filter((r) => r.status === 'void').length})`,
      items: rows.filter((r) => r.status === 'void'),
      empty: 'Nothing cancelled.',
    },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Invoices"
        subtitle="Raised from an enquiry, paid by card, PayPal or bank transfer."
      />

      {tableMissing && (
        <div className="rounded-card border border-warn/40 bg-warn-tint px-5 py-4 text-sm text-warn">
          Apply{' '}
          <code className="font-mono text-xs">
            supabase/migrations/20260831_0009_invoices.sql
          </code>{' '}
          in the Supabase SQL editor to switch invoicing on.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Awaiting payment"
          value={formatMoney(outstanding.reduce((s, r) => s + r.total_pence, 0))}
          icon={Clock}
          tile="bg-warn-tint text-warn"
        />
        <StatCard
          label="Paid this month"
          value={formatMoney(thisMonth)}
          icon={PoundSterling}
          tile="bg-success-tint text-success"
        />
        <StatCard
          label="Invoices raised"
          value={String(rows.length)}
          icon={ReceiptText}
          tile="bg-teal-tint text-teal"
        />
      </div>

      {groups.map((g) => (
        <Card key={g.title}>
          <SectionHead title={g.title} />
          {g.items.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-muted">{g.empty}</p>
          ) : (
            <ul className="divide-y divide-line">
              {g.items.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-ink">
                        {inv.reference}
                      </span>
                      <span className={`pill ${STYLE[inv.status]}`}>
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">
                      {inv.customer_name}
                      {inv.child_name ? ` · ${inv.child_name}` : ''}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                      <span>{inv.customer_email}</span>
                      <span>Raised {when(inv.created_at)}</span>
                      {inv.due_on && inv.status === 'sent' && (
                        <span>Due {when(inv.due_on)}</span>
                      )}
                      {inv.paid_at && <span>Paid {when(inv.paid_at)}</span>}
                      {inv.enquiry_id && (
                        <Link
                          href={`/admin/enquiries/${inv.enquiry_id}`}
                          className="font-semibold text-teal hover:text-coral"
                        >
                          Open the enquiry
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="font-display text-lg font-bold text-ink">
                      {formatMoney(inv.total_pence)}
                    </span>
                    <InvoiceActions id={inv.id} status={inv.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}

      {!tableMissing && rows.length === 0 && (
        <Card>
          <div className="px-5 py-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-ink-muted" aria-hidden />
            <p className="mt-3 font-semibold text-ink">No invoices yet.</p>
            <p className="mt-1 text-sm text-ink-muted">
              Open an enquiry and raise one — the price fills itself in from the class the
              parent picked.
            </p>
            <Link href="/admin/enquiries" className="btn-secondary mt-5 px-4 py-2 text-sm">
              Go to enquiries
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}
