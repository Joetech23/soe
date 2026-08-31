import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Building2, CircleAlert, Clock } from 'lucide-react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { invoiceByToken } from '@/lib/invoices'
import { PayPanel } from '@/components/invoice/pay-panel'
import { formatMoney } from '@/lib/utils'
import { site } from '@/lib/site'

export const dynamic = 'force-dynamic'

// A private link to somebody's bill has no business in a search index.
export const metadata: Metadata = {
  title: 'Your invoice',
  robots: { index: false, follow: false },
}

function when(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function PayInvoice({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { paid?: string; cancelled?: string; pending?: string; error?: string }
}) {
  if (!hasAdminCredentials()) notFound()

  const db = createAdminClient()
  const invoice = await invoiceByToken(db, params.token)
  if (!invoice) notFound()

  // Tells Ms Betty the parent has at least seen it. Best-effort, and only the
  // first time, so a refresh does not keep rewriting the row.
  if (!invoice.viewed_at) {
    await db
      .from('invoices')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', invoice.id)
      .then(undefined, () => undefined)
  }

  const paid = invoice.status === 'paid' || searchParams.paid === '1'
  const cancelled = invoice.status === 'void'

  return (
    <div className="shell section">
      <div className="mx-auto max-w-xl">
        {/* ── Status banner ─────────────────────────────────────────────── */}
        {paid && (
          <div className="mb-6 flex items-start gap-3 rounded-card border border-success/30 bg-success-tint px-5 py-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
            <div>
              <p className="font-semibold text-success">Paid in full — thank you.</p>
              <p className="mt-0.5 text-sm text-ink-soft">
                A receipt is on its way to {invoice.customer_email}.
              </p>
            </div>
          </div>
        )}

        {searchParams.pending === '1' && !paid && (
          <div className="mb-6 flex items-start gap-3 rounded-card border border-warn/30 bg-warn-tint px-5 py-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
            <div>
              <p className="font-semibold text-warn">Your payment is still going through.</p>
              <p className="mt-0.5 text-sm text-ink-soft">
                Give it a minute and refresh this page. Nothing is charged twice if you
                try again.
              </p>
            </div>
          </div>
        )}

        {(searchParams.error === '1' || searchParams.cancelled === '1') && !paid && (
          <div className="mb-6 flex items-start gap-3 rounded-card border border-line bg-surface px-5 py-4">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
            <div>
              <p className="font-semibold text-ink">
                {searchParams.cancelled === '1'
                  ? 'That payment was cancelled.'
                  : 'That did not go through.'}
              </p>
              <p className="mt-0.5 text-sm text-ink-soft">
                Nothing has been taken. You can try again below, or email{' '}
                {site.contact.email} and {site.owner} will sort it out.
              </p>
            </div>
          </div>
        )}

        {/* ── The invoice ───────────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="border-b border-line px-6 py-5">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-teal">
              Invoice {invoice.reference}
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-ink">
              {cancelled ? 'This invoice was cancelled' : `Hello ${invoice.customer_name}`}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {cancelled
                ? 'There is nothing to pay. If you were expecting to pay something, please get in touch.'
                : invoice.child_name
                  ? `Tuition for ${invoice.child_name} with ${site.owner}.`
                  : `Tuition with ${site.owner}.`}
            </p>
          </div>

          <div className="px-6 py-5">
            <ul className="divide-y divide-line">
              {invoice.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{item.description}</p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-ink-muted">
                        {item.quantity} × {formatMoney(item.unit_pence)}
                      </p>
                    )}
                  </div>
                  <span className="whitespace-nowrap text-sm text-ink">
                    {formatMoney(item.amount_pence)}
                  </span>
                </li>
              ))}
            </ul>

            {invoice.discount_pence > 0 && (
              <div className="flex justify-between gap-4 border-t border-line pt-3 text-sm">
                <span className="text-teal">Discount</span>
                <span className="text-teal">−{formatMoney(invoice.discount_pence)}</span>
              </div>
            )}

            <div className="mt-3 flex items-baseline justify-between gap-4 border-t-2 border-ink/10 pt-4">
              <span className="font-semibold text-ink">Total</span>
              <span className="font-display text-3xl font-extrabold text-ink">
                {formatMoney(invoice.total_pence)}
              </span>
            </div>

            {invoice.due_on && !paid && !cancelled && (
              <p className="mt-2 text-right text-xs text-ink-muted">
                Due by {when(invoice.due_on)}
              </p>
            )}

            {invoice.notes && (
              <p className="mt-5 whitespace-pre-line rounded-xl bg-surface-sunk px-4 py-3.5 text-sm leading-relaxed text-ink-soft">
                {invoice.notes}
              </p>
            )}
          </div>

          {/* ── How to pay ──────────────────────────────────────────────── */}
          {!paid && !cancelled && (
            <div className="border-t border-line bg-canvas px-6 py-6">
              {invoice.payment_method === 'custom' ? (
                <div>
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                    <Building2 className="h-4.5 w-4.5 text-teal" aria-hidden />
                    Pay by bank transfer
                  </h2>
                  {invoice.payment_instructions ? (
                    <div className="mt-3 whitespace-pre-line rounded-xl border border-line bg-surface px-4 py-3.5 text-sm leading-relaxed text-ink">
                      {invoice.payment_instructions}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-ink-soft">
                      Please email {site.contact.email} and {site.owner} will send you the
                      bank details.
                    </p>
                  )}
                  <p className="mt-3 text-sm text-ink-soft">
                    Please use <strong className="text-ink">{invoice.reference}</strong> as
                    the payment reference so it can be matched to your booking.
                  </p>
                </div>
              ) : (
                <PayPanel
                  token={params.token}
                  method={invoice.payment_method}
                  amountLabel={formatMoney(invoice.total_pence)}
                />
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Questions about this invoice? Email{' '}
          <a
            href={`mailto:${site.contact.email}?subject=Invoice ${invoice.reference}`}
            className="font-semibold text-teal hover:text-coral"
          >
            {site.contact.email}
          </a>{' '}
          or{' '}
          <Link href="/" className="font-semibold text-teal hover:text-coral">
            visit the site
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
