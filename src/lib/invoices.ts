import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  InvoiceRow,
  InvoiceItemRow,
  InvoiceMethod,
  InvoiceStatus,
} from '@/lib/supabase/types'
import { mintToken, hashToken } from '@/lib/downloads'
import { sendEmail, redact } from '@/lib/email/send'
import {
  invoiceEmail,
  invoicePaidEmail,
  ownerInvoicePaidEmail,
} from '@/lib/email/templates'
import { siteUrl } from '@/lib/utils'
import { site } from '@/lib/site'

type Admin = SupabaseClient<Database>

export type InvoiceDraftLine = {
  description: string
  quantity: number
  unitPence: number
}

export type InvoiceWithItems = InvoiceRow & { items: InvoiceItemRow[] }

/**
 * Invoice reference.
 *
 * Same alphabet as the enquiry reference — no 0/O/1/I/L — because these get
 * read down the phone and written on a bank transfer.
 */
export function invoiceReference(): string {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
  const bytes = crypto.getRandomValues(new Uint8Array(5))
  let out = 'INV-'
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

/** The parent-facing page for an invoice. The raw token is the only credential. */
export function invoicePayUrl(rawToken: string): string {
  return siteUrl(`/pay/${rawToken}`)
}

/** Never throws: an audit line failing must not fail the thing it describes. */
export async function logInvoiceEvent(
  db: Admin,
  invoiceId: string,
  kind: string,
  detail?: string,
  actorId?: string | null
): Promise<void> {
  try {
    await db.from('invoice_events').insert({
      invoice_id: invoiceId,
      kind,
      detail: detail ?? null,
      actor_id: actorId ?? null,
    })
  } catch (err) {
    console.warn('[invoices] could not log event', err)
  }
}

/**
 * Recompute the cached totals from the items actually stored.
 *
 * Called after every write. The client sends line descriptions and unit prices,
 * but the figure the parent is asked to pay is always derived here — the same
 * rule the shop's `create_order` follows, for the same reason.
 */
export async function recalcInvoiceTotals(
  db: Admin,
  invoiceId: string
): Promise<{ subtotal: number; total: number }> {
  const { data, error } = await db
    .from('invoice_items')
    .select('amount_pence')
    .eq('invoice_id', invoiceId)
  if (error) throw error

  const subtotal = ((data ?? []) as { amount_pence: number }[]).reduce(
    (sum, i) => sum + i.amount_pence,
    0
  )

  const { data: inv } = await db
    .from('invoices')
    .select('discount_pence')
    .eq('id', invoiceId)
    .maybeSingle()

  const discount = Math.min((inv as { discount_pence: number } | null)?.discount_pence ?? 0, subtotal)
  const total = subtotal - discount

  const { error: upErr } = await db
    .from('invoices')
    .update({ subtotal_pence: subtotal, discount_pence: discount, total_pence: total })
    .eq('id', invoiceId)
  if (upErr) throw upErr

  return { subtotal, total }
}

/** Mint (or re-mint) the private link token. Returns the raw value. */
export async function mintInvoiceToken(db: Admin, invoiceId: string): Promise<string> {
  const raw = mintToken()
  const { error } = await db
    .from('invoices')
    .update({ token_hash: hashToken(raw) })
    .eq('id', invoiceId)
  if (error) throw error
  return raw
}

/** Resolve a pay link. Void invoices are deliberately still readable — the
 *  parent should see "cancelled", not a 404 that looks like a broken link. */
export async function invoiceByToken(
  db: Admin,
  rawToken: string
): Promise<InvoiceWithItems | null> {
  const { data, error } = await db
    .from('invoices')
    .select('*')
    .eq('token_hash', hashToken(rawToken))
    .maybeSingle()
  if (error || !data) return null

  const invoice = data as InvoiceRow
  const { data: items } = await db
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoice.id)
    .order('sort_order')

  return { ...invoice, items: (items ?? []) as InvoiceItemRow[] }
}

export async function loadInvoice(
  db: Admin,
  invoiceId: string
): Promise<InvoiceWithItems | null> {
  const { data } = await db.from('invoices').select('*').eq('id', invoiceId).maybeSingle()
  if (!data) return null
  const { data: items } = await db
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order')
  return { ...(data as InvoiceRow), items: (items ?? []) as InvoiceItemRow[] }
}

/** A one-line summary for provider checkout pages and email subjects. */
export function invoiceSummary(invoice: InvoiceWithItems): string {
  const first = invoice.items[0]?.description ?? 'Tuition'
  const more = invoice.items.length - 1
  return more > 0 ? `${first} and ${more} more` : first
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Awaiting payment',
  paid: 'Paid',
  void: 'Cancelled',
}

export const METHOD_DESCRIPTIONS: Record<InvoiceMethod, string> = {
  custom: 'The parent pays by bank transfer and you tick it off here.',
  stripe: 'The parent pays by card. Marked paid automatically.',
  paypal: 'The parent pays with PayPal. Marked paid automatically.',
}

/** True when the invoice is in a state where money can still be taken. */
export function isPayable(invoice: InvoiceRow): boolean {
  return invoice.status === 'sent' || invoice.status === 'draft'
}

/* -------------------------------------------------------------------------- */
/*  Sending and settling                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Email the invoice to the parent and move it to `sent`.
 *
 * The link token is minted here rather than at creation, so a draft that is
 * still being edited has no live URL in existence. Re-sending reuses the same
 * token: parents forward these emails, and invalidating the earlier one would
 * break a link someone is looking at.
 */
export async function sendInvoice(
  db: Admin,
  invoiceId: string,
  actorId?: string | null
): Promise<{ ok: true; payUrl: string; mailed: boolean } | { ok: false; message: string }> {
  const invoice = await loadInvoice(db, invoiceId)
  if (!invoice) return { ok: false, message: 'That invoice no longer exists.' }
  if (invoice.status === 'void') return { ok: false, message: 'That invoice was cancelled.' }
  if (invoice.items.length === 0) {
    return { ok: false, message: 'Add at least one line before sending it.' }
  }

  // A £0 invoice is a mistake, not a gift — it would render a pay button that
  // no provider will accept.
  if (invoice.total_pence <= 0) {
    return { ok: false, message: 'The total is £0. Set a price before sending.' }
  }

  let raw: string
  if (invoice.token_hash) {
    // Existing token stays valid, but we cannot recover the raw value from the
    // hash — so a re-send needs a fresh one. Noted in the audit trail.
    raw = await mintInvoiceToken(db, invoiceId)
    await logInvoiceEvent(db, invoiceId, 'note', 'link re-issued on re-send', actorId)
  } else {
    raw = await mintInvoiceToken(db, invoiceId)
  }

  const payUrl = invoicePayUrl(raw)

  const mail = invoiceEmail({
    parentName: invoice.customer_name,
    reference: invoice.reference,
    childName: invoice.child_name,
    lines: invoice.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPence: i.unit_pence,
      amountPence: i.amount_pence,
    })),
    subtotalPence: invoice.subtotal_pence,
    discountPence: invoice.discount_pence,
    totalPence: invoice.total_pence,
    payUrl,
    method: invoice.payment_method,
    instructions: invoice.payment_instructions,
    notes: invoice.notes,
    dueOn: invoice.due_on,
  })

  const res = await sendEmail({
    to: invoice.customer_email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    tag: 'invoice',
  })

  // Status moves even if the mail provider is unconfigured or down: the invoice
  // exists and the link works, and Ms Betty can copy it into WhatsApp. A failed
  // send that silently left the invoice as a draft would be worse.
  await db
    .from('invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .neq('status', 'paid')

  await logInvoiceEvent(
    db,
    invoiceId,
    'sent',
    res.status === 'sent' ? `emailed to ${redact(invoice.customer_email)}` : `email ${res.status}`,
    actorId
  )

  return { ok: true, payUrl, mailed: res.status === 'sent' }
}

/**
 * Mark an invoice paid and send the receipt — exactly once.
 *
 * The conditional UPDATE lives in `mark_invoice_paid`, so a provider redirect
 * and a second tab arriving together cannot both send a receipt.
 */
export async function settleInvoice(
  db: Admin,
  invoiceId: string,
  method: InvoiceMethod,
  reference: string | null,
  actorId?: string | null,
  /** The parent's own link, when the caller has it — used in the receipt. */
  payUrl?: string
): Promise<{ newlyPaid: boolean; invoice: InvoiceWithItems | null }> {
  const { data, error } = await db.rpc('mark_invoice_paid', {
    _invoice_id: invoiceId,
    _method: method,
    _reference: reference,
    _actor: actorId ?? null,
  } as never)
  if (error) throw error

  const row = (data as { newly_paid: boolean }[] | null)?.[0]
  const invoice = await loadInvoice(db, invoiceId)
  if (!row?.newly_paid || !invoice) return { newlyPaid: false, invoice }

  // Receipts must never be able to un-settle a payment, so every send is
  // best-effort and the failures are logged rather than thrown.
  const receipt = invoicePaidEmail({
    parentName: invoice.customer_name,
    reference: invoice.reference,
    totalPence: invoice.total_pence,
    // Only the raw token opens the invoice, and it is deliberately not stored.
    // When the caller does not have it, the receipt links to the site instead
    // of minting a second token just to say thank you.
    payUrl: payUrl ?? siteUrl('/'),
  })

  const owner = ownerInvoicePaidEmail({
    reference: invoice.reference,
    parentName: invoice.customer_name,
    parentEmail: invoice.customer_email,
    totalPence: invoice.total_pence,
    method: METHOD_EMAIL_LABELS[method],
  })

  await Promise.allSettled([
    sendEmail({
      to: invoice.customer_email,
      subject: receipt.subject,
      html: receipt.html,
      text: receipt.text,
      tag: 'invoice-paid',
    }),
    sendEmail({
      to: process.env.OWNER_NOTIFICATION_EMAIL ?? site.contact.email,
      replyTo: invoice.customer_email,
      subject: owner.subject,
      html: owner.html,
      text: owner.text,
      tag: 'invoice-paid-owner',
    }),
  ])

  return { newlyPaid: true, invoice }
}

const METHOD_EMAIL_LABELS: Record<InvoiceMethod, string> = {
  custom: 'Bank transfer / manual',
  stripe: 'Card (Stripe)',
  paypal: 'PayPal',
}
