import Link from 'next/link'
import {
  Inbox,
  PhoneCall,
  UserCheck,
  Clock,
  Mail,
  Phone,
  ArrowRight,
  ReceiptText,
} from 'lucide-react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { AdminPageHeader, Card, SectionHead, StatCard } from '@/components/admin/ui'
import { suggestionForSubject } from '@/lib/classes'
import { formatMoney } from '@/lib/utils'
import type {
  BookingRequestRow,
  EnquiryStatus,
  InvoiceRow,
  WaitlistRow,
} from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Enquiries', robots: { index: false } }

function when(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_STYLE: Record<EnquiryStatus, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-coral-tint text-coral-deep' },
  contacted: { label: 'Contacted', cls: 'bg-teal-tint text-teal-deep' },
  converted: { label: 'Booked in', cls: 'bg-success-tint text-success' },
  waitlist: { label: 'Waiting list', cls: 'bg-warn-tint text-warn' },
  closed: { label: 'Closed', cls: 'bg-surface-sunk text-ink-muted' },
}

export default async function AdminEnquiries() {
  let enquiries: BookingRequestRow[] = []
  let invoices: InvoiceRow[] = []
  let waitlist: WaitlistRow[] = []
  let groupNames = new Map<string, string>()
  let invoicesMissing = false

  if (hasAdminCredentials()) {
    const db = createAdminClient()

    const [enq, inv, wait, groups] = await Promise.all([
      db
        .from('booking_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300),
      db.from('invoices').select('*').order('created_at', { ascending: false }).limit(300),
      db
        .from('waitlist_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      db.from('groups').select('id, name'),
    ])

    enquiries = (enq.data ?? []) as BookingRequestRow[]
    // The 0009 migration may not be applied yet — the page must still work.
    invoicesMissing = Boolean(inv.error && /does not exist|schema cache/i.test(inv.error.message))
    invoices = (inv.data ?? []) as InvoiceRow[]
    waitlist = (wait.data ?? []) as WaitlistRow[]
    groupNames = new Map(
      ((groups.data ?? []) as { id: string; name: string }[]).map((g) => [g.id, g.name])
    )
  }

  const invoicesByEnquiry = new Map<string, InvoiceRow[]>()
  for (const i of invoices) {
    if (!i.enquiry_id) continue
    const list = invoicesByEnquiry.get(i.enquiry_id) ?? []
    list.push(i)
    invoicesByEnquiry.set(i.enquiry_id, list)
  }

  const open = enquiries.filter((e) => e.status === 'new')
  const contacted = enquiries.filter((e) => e.status === 'contacted')
  const converted = enquiries.filter((e) => e.status === 'converted')
  const rest = enquiries.filter(
    (e) => e.status === 'closed' || e.status === 'waitlist'
  )

  const owed = invoices
    .filter((i) => i.status === 'sent')
    .reduce((sum, i) => sum + i.total_pence, 0)

  const sections = [
    { title: `Needs a reply (${open.length})`, items: open, empty: 'Nothing waiting. New booking requests land here first.' },
    { title: `In conversation (${contacted.length})`, items: contacted, empty: 'Nobody mid-conversation.' },
    { title: `Booked in (${converted.length})`, items: converted, empty: 'No conversions yet.' },
    { title: `Waiting list and closed (${rest.length})`, items: rest, empty: 'Nothing here.' },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Enquiries"
        subtitle="Every booking request from the site, and what happened next."
        action={
          <Link href="/admin/invoices" className="btn-secondary min-h-0 px-4 py-2 text-sm">
            <ReceiptText className="h-4 w-4" aria-hidden /> Invoices
          </Link>
        }
      />

      {invoicesMissing && (
        <div className="rounded-card border border-warn/40 bg-warn-tint px-5 py-4 text-sm text-warn">
          Invoicing is not switched on yet — apply{' '}
          <code className="font-mono text-xs">
            supabase/migrations/20260831_0009_invoices.sql
          </code>{' '}
          in the Supabase SQL editor and this page gains its invoice actions.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Needs a reply" value={String(open.length)} icon={Inbox} tile="bg-coral-tint text-coral" />
        <StatCard label="In conversation" value={String(contacted.length)} icon={PhoneCall} tile="bg-teal-tint text-teal" />
        <StatCard label="Booked in" value={String(converted.length)} icon={UserCheck} tile="bg-success-tint text-success" />
        <StatCard label="Invoiced, unpaid" value={formatMoney(owed)} icon={Clock} tile="bg-warn-tint text-warn" />
      </div>

      {sections.map((section) => (
        <Card key={section.title}>
          <SectionHead title={section.title} />
          {section.items.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-muted">{section.empty}</p>
          ) : (
            <ul className="divide-y divide-line">
              {section.items.map((e) => {
                const priced = suggestionForSubject(e.subject)
                const theirInvoices = invoicesByEnquiry.get(e.id) ?? []
                const paid = theirInvoices.filter((i) => i.status === 'paid')
                const awaiting = theirInvoices.filter((i) => i.status === 'sent')
                const style = STATUS_STYLE[e.status]

                return (
                  <li key={e.id}>
                    <Link
                      href={`/admin/enquiries/${e.id}`}
                      className="group flex flex-wrap items-start gap-4 px-5 py-4 transition-colors hover:bg-surface-sunk/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink">{e.child_name}</span>
                          {e.year_group && (
                            <span className="text-sm text-ink-muted">{e.year_group}</span>
                          )}
                          <span className={`pill ${style.cls}`}>{style.label}</span>
                          {e.intent === 'waitlist' && (
                            <span className="pill bg-surface-sunk text-ink-muted">
                              Asked for the waiting list
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-ink-soft">{e.subject ?? '—'}</p>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                          <span>{e.parent_name}</span>
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" aria-hidden /> {e.email}
                          </span>
                          {e.phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" aria-hidden /> {e.phone}
                            </span>
                          )}
                          <span className="font-mono">{e.reference}</span>
                          <span>{when(e.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
                        {priced && (
                          <span className="font-display text-lg font-bold text-ink">
                            {formatMoney(priced.unitPence)}
                            <span className="text-xs font-normal text-ink-muted">
                              /{priced.unit}
                            </span>
                          </span>
                        )}
                        {paid.length > 0 && (
                          <span className="pill bg-success-tint text-success">
                            Paid {formatMoney(paid.reduce((s, i) => s + i.total_pence, 0))}
                          </span>
                        )}
                        {awaiting.length > 0 && (
                          <span className="pill bg-warn-tint text-warn">
                            Awaiting {formatMoney(awaiting.reduce((s, i) => s + i.total_pence, 0))}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-teal group-hover:text-coral">
                          Open <ArrowRight className="h-3 w-3" aria-hidden />
                        </span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      ))}

      <Card>
        <SectionHead title={`Waiting list (${waitlist.length})`} />
        {waitlist.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-muted">
            Nobody is waiting. Parents land here when they try to book a class that is
            already full.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {waitlist.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">
                      {w.child_name || w.parent_name}
                    </span>
                    <span className="pill bg-surface-sunk text-ink-muted">
                      {groupNames.get(w.group_id) ?? 'Class removed'}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                    <span>{w.parent_name}</span>
                    <span>{w.email}</span>
                    {w.phone && <span>{w.phone}</span>}
                    <span>{when(w.created_at)}</span>
                  </div>
                </div>
                <span className="pill bg-warn-tint text-warn">{w.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
