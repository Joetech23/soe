import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Mail,
  Phone,
  CalendarDays,
  MessageSquare,
  ReceiptText,
  Settings,
} from 'lucide-react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { AdminPageHeader, Card, SectionHead } from '@/components/admin/ui'
import {
  EnquiryStatusActions,
  EnquiryNotes,
  InvoiceBuilder,
  InvoiceActions,
} from '@/components/admin/enquiry-forms'
import { suggestionForSubject } from '@/lib/classes'
import { availableMethods } from '@/lib/payments/config'
import { getSettings } from '@/lib/settings'
import { INVOICE_STATUS_LABELS } from '@/lib/invoices'
import { formatMoney } from '@/lib/utils'
import type {
  BookingRequestRow,
  EnquiryStatus,
  InvoiceItemRow,
  InvoiceRow,
  InvoiceStatus,
} from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Enquiry', robots: { index: false } }

function when(iso: string, withTime = false) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

const STATUS_STYLE: Record<EnquiryStatus, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-coral-tint text-coral-deep' },
  contacted: { label: 'Contacted', cls: 'bg-teal-tint text-teal-deep' },
  converted: { label: 'Booked in', cls: 'bg-success-tint text-success' },
  waitlist: { label: 'Waiting list', cls: 'bg-warn-tint text-warn' },
  closed: { label: 'Closed', cls: 'bg-surface-sunk text-ink-muted' },
}

const INVOICE_STYLE: Record<InvoiceStatus, string> = {
  draft: 'bg-surface-sunk text-ink-muted',
  sent: 'bg-warn-tint text-warn',
  paid: 'bg-success-tint text-success',
  void: 'bg-surface-sunk text-ink-muted line-through',
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  )
}

export default async function EnquiryDetail({ params }: { params: { id: string } }) {
  if (!hasAdminCredentials()) notFound()
  const db = createAdminClient()

  const { data } = await db
    .from('booking_requests')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (!data) notFound()
  const enquiry = data as BookingRequestRow

  const { data: invoiceData, error: invoiceErr } = await db
    .from('invoices')
    .select('*')
    .eq('enquiry_id', enquiry.id)
    .order('created_at', { ascending: false })

  const invoicingReady = !invoiceErr || !/does not exist|schema cache/i.test(invoiceErr.message)
  const invoices = (invoiceData ?? []) as InvoiceRow[]

  // One query for every line rather than one per invoice.
  const itemsByInvoice = new Map<string, InvoiceItemRow[]>()
  if (invoices.length > 0) {
    const { data: items } = await db
      .from('invoice_items')
      .select('*')
      .in(
        'invoice_id',
        invoices.map((i) => i.id)
      )
      .order('sort_order')
    for (const item of (items ?? []) as InvoiceItemRow[]) {
      const list = itemsByInvoice.get(item.invoice_id) ?? []
      list.push(item)
      itemsByInvoice.set(item.invoice_id, list)
    }
  }

  const settings = await getSettings()
  const methods = availableMethods()
  const suggestion = suggestionForSubject(enquiry.subject)
  const style = STATUS_STYLE[enquiry.status]

  return (
    <div className="space-y-6">
      <Link
        href="/admin/enquiries"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-teal"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All enquiries
      </Link>

      <AdminPageHeader
        title={enquiry.child_name}
        subtitle={`${enquiry.reference} · received ${when(enquiry.created_at)}`}
        action={<span className={`pill ${style.cls}`}>{style.label}</span>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* ── What they asked for ─────────────────────────────────────── */}
          <Card>
            <SectionHead title="The request" />
            <dl className="grid gap-5 px-5 py-5 sm:grid-cols-2">
              <Detail label="Parent">{enquiry.parent_name}</Detail>
              <Detail label="Child">
                {enquiry.child_name}
                {enquiry.year_group ? ` · ${enquiry.year_group}` : ''}
              </Detail>
              <Detail label="Email">
                <a
                  href={`mailto:${enquiry.email}?subject=${encodeURIComponent(
                    `Your enquiry ${enquiry.reference}`
                  )}`}
                  className="inline-flex items-center gap-1.5 font-medium text-teal hover:text-coral"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden /> {enquiry.email}
                </a>
              </Detail>
              <Detail label="Phone">
                {enquiry.phone ? (
                  <a
                    href={`tel:${enquiry.phone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1.5 font-medium text-teal hover:text-coral"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden /> {enquiry.phone}
                  </a>
                ) : (
                  <span className="text-ink-muted">Not given</span>
                )}
              </Detail>
              <div className="sm:col-span-2">
                <Detail label="Class they picked">
                  <span className="font-medium">{enquiry.subject ?? 'Not specified'}</span>
                  {/* Most option labels already carry the price; repeating it
                      reads as a stutter. Only add it when it is missing. */}
                  {suggestion && !enquiry.subject?.includes('£') && (
                    <span className="ml-2 text-ink-muted">
                      — {formatMoney(suggestion.unitPence)} per {suggestion.unit}
                    </span>
                  )}
                </Detail>
              </div>
              {enquiry.notes && (
                <div className="sm:col-span-2">
                  <Detail label="What they wrote">
                    <p className="whitespace-pre-line rounded-xl bg-surface-sunk px-3.5 py-3 text-sm leading-relaxed text-ink-soft">
                      {enquiry.notes}
                    </p>
                  </Detail>
                </div>
              )}
              <div className="sm:col-span-2">
                <Detail label="Where they are up to">
                  <div className="mt-2">
                    <EnquiryStatusActions id={enquiry.id} status={enquiry.status} />
                  </div>
                </Detail>
              </div>
            </dl>
          </Card>

          {/* ── Invoicing ───────────────────────────────────────────────── */}
          {invoicingReady ? (
            <Card>
              <SectionHead title="Send an invoice" />
              <div className="px-5 py-5">
                <InvoiceBuilder
                  enquiryId={enquiry.id}
                  suggestion={suggestion}
                  methods={methods}
                  defaultMethod={methods[0] ?? 'custom'}
                  hasBankDetails={Boolean(settings.invoiceInstructions)}
                />
              </div>
            </Card>
          ) : (
            <Card>
              <div className="px-5 py-6 text-sm text-ink-soft">
                <p className="font-semibold text-ink">Invoicing is not switched on yet.</p>
                <p className="mt-1.5">
                  Run{' '}
                  <code className="font-mono text-xs">
                    supabase/migrations/20260831_0009_invoices.sql
                  </code>{' '}
                  in the Supabase SQL editor and this becomes an invoice builder priced
                  from the class above.
                </p>
              </div>
            </Card>
          )}

          {invoices.length > 0 && (
            <Card>
              <SectionHead title={`Invoices (${invoices.length})`} />
              <ul className="divide-y divide-line">
                {invoices.map((inv) => {
                  const lines = itemsByInvoice.get(inv.id) ?? []
                  return (
                    <li key={inv.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-ink">
                              {inv.reference}
                            </span>
                            <span className={`pill ${INVOICE_STYLE[inv.status]}`}>
                              {INVOICE_STATUS_LABELS[inv.status]}
                            </span>
                            <span className="pill bg-surface-sunk text-ink-muted">
                              {inv.payment_method === 'custom'
                                ? 'Bank transfer'
                                : inv.payment_method === 'stripe'
                                  ? 'Card'
                                  : 'PayPal'}
                            </span>
                          </div>
                          <div className="mt-1.5 text-xs text-ink-muted">
                            Raised {when(inv.created_at)}
                            {inv.sent_at ? ` · sent ${when(inv.sent_at)}` : ''}
                            {inv.due_on ? ` · due ${when(inv.due_on)}` : ''}
                            {inv.paid_at ? ` · paid ${when(inv.paid_at)}` : ''}
                          </div>
                        </div>
                        <span className="font-display text-xl font-bold text-ink">
                          {formatMoney(inv.total_pence)}
                        </span>
                      </div>

                      {lines.length > 0 && (
                        <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                          {lines.map((l) => (
                            <li key={l.id} className="flex justify-between gap-4">
                              <span>
                                {l.description}
                                {l.quantity > 1 && (
                                  <span className="text-ink-muted">
                                    {' '}
                                    × {l.quantity}
                                  </span>
                                )}
                              </span>
                              <span className="whitespace-nowrap">
                                {formatMoney(l.amount_pence)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {inv.payment_reference && (
                        <p className="mt-2 text-xs text-ink-muted">
                          Payment reference: {inv.payment_reference}
                        </p>
                      )}

                      <div className="mt-3">
                        <InvoiceActions id={inv.id} status={inv.status} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </div>

        {/* ── Side column ──────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card>
            <SectionHead title="Your notes" />
            <div className="px-5 py-5">
              <EnquiryNotes id={enquiry.id} notes={enquiry.admin_notes} />
              <p className="mt-3 text-xs text-ink-muted">
                Only you see these. The parent never does.
              </p>
            </div>
          </Card>

          <Card>
            <SectionHead title="Quick actions" />
            <div className="space-y-2 px-5 py-5 text-sm">
              <a
                href={`mailto:${enquiry.email}?subject=${encodeURIComponent(
                  `Your enquiry ${enquiry.reference} — Spirit of Excellence Tuition`
                )}`}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-semibold text-ink hover:bg-surface-sunk"
              >
                <Mail className="h-4 w-4 text-teal" aria-hidden /> Email this parent
              </a>
              {enquiry.phone && (
                <a
                  href={`https://wa.me/${enquiry.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-semibold text-ink hover:bg-surface-sunk"
                >
                  <MessageSquare className="h-4 w-4 text-teal" aria-hidden /> WhatsApp them
                </a>
              )}
              <Link
                href="/admin/children"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-semibold text-ink hover:bg-surface-sunk"
              >
                <CalendarDays className="h-4 w-4 text-teal" aria-hidden /> Add the child to a
                group
              </Link>
              <Link
                href="/admin/invoices"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-semibold text-ink hover:bg-surface-sunk"
              >
                <ReceiptText className="h-4 w-4 text-teal" aria-hidden /> All invoices
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-semibold text-ink hover:bg-surface-sunk"
              >
                <Settings className="h-4 w-4 text-teal" aria-hidden /> Bank details for
                invoices
              </Link>
            </div>
          </Card>

          <Card>
            <SectionHead title="Consent" />
            <dl className="space-y-3 px-5 py-5">
              <Detail label="Agreed to the terms">
                {when(enquiry.terms_agreed_at, true)}
                {enquiry.terms_version ? ` (${enquiry.terms_version})` : ''}
              </Detail>
              <Detail label="Came in as">
                {enquiry.intent === 'waitlist' ? 'Waiting-list request' : 'Booking request'}
              </Detail>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}
