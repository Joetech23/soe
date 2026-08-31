'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { hasRole } from '@/lib/supabase/rpc'
import { getSettings } from '@/lib/settings'
import {
  invoiceReference,
  recalcInvoiceTotals,
  logInvoiceEvent,
  sendInvoice,
  settleInvoice,
  loadInvoice,
} from '@/lib/invoices'
import type { BookingRequestRow, EnquiryStatus, InvoiceMethod } from '@/lib/supabase/types'

export type ActionResult = { ok: boolean; message: string }

/**
 * Every action re-verifies the admin role.
 *
 * The middleware already gates /admin, but a server action is a public HTTP
 * endpoint reachable by its id — the route it happens to live under proves
 * nothing about the caller.
 */
async function requireAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')
  if (!(await hasRole(supabase, user.id, 'admin'))) throw new Error('Not authorised.')
  if (!hasAdminCredentials()) throw new Error('Server not configured.')
  return { db: createAdminClient(), userId: user.id }
}

function refresh(enquiryId?: string) {
  revalidatePath('/admin/enquiries')
  revalidatePath('/admin/invoices')
  revalidatePath('/admin')
  if (enquiryId) revalidatePath(`/admin/enquiries/${enquiryId}`)
}

function fail(err: unknown, fallback: string): ActionResult {
  return { ok: false, message: err instanceof Error ? err.message : fallback }
}

/* -------------------------------------------------------------------------- */
/*  The enquiry itself                                                        */
/* -------------------------------------------------------------------------- */

export async function setEnquiryStatus(
  id: string,
  status: EnquiryStatus
): Promise<ActionResult> {
  try {
    const { db } = await requireAdmin()
    const { error } = await db.from('booking_requests').update({ status }).eq('id', id)
    if (error) throw error
    refresh(id)
    const said: Record<EnquiryStatus, string> = {
      new: 'Moved back to new.',
      contacted: 'Marked as contacted.',
      converted: 'Marked as booked in.',
      waitlist: 'Moved to the waiting list.',
      closed: 'Closed.',
    }
    return { ok: true, message: said[status] }
  } catch (err) {
    return fail(err, 'Could not update that enquiry.')
  }
}

export async function saveEnquiryNotes(id: string, notes: string): Promise<ActionResult> {
  try {
    const { db } = await requireAdmin()
    const { error } = await db
      .from('booking_requests')
      .update({ admin_notes: notes.trim().slice(0, 4000) || null })
      .eq('id', id)
    if (error) throw error
    refresh(id)
    return { ok: true, message: 'Notes saved.' }
  } catch (err) {
    return fail(err, 'Could not save those notes.')
  }
}

/* -------------------------------------------------------------------------- */
/*  Invoices                                                                  */
/* -------------------------------------------------------------------------- */

export type InvoiceLineInput = {
  description: string
  quantity: number
  unitPence: number
}

export type CreateInvoiceInput = {
  enquiryId: string
  lines: InvoiceLineInput[]
  method: InvoiceMethod
  discountPence?: number
  dueOn?: string | null
  notes?: string | null
  /** Email it straight away rather than leaving a draft. */
  send: boolean
}

const METHODS: InvoiceMethod[] = ['custom', 'stripe', 'paypal']

/** Trust nothing from the form: prices are integers in pence, in a sane range. */
function cleanLines(lines: InvoiceLineInput[]): InvoiceLineInput[] {
  return lines
    .map((l) => ({
      description: String(l.description ?? '').trim().slice(0, 200),
      quantity: Math.min(Math.max(Math.round(Number(l.quantity) || 1), 1), 999),
      // £5,000 a line is far beyond anything Ms Betty charges; a figure above
      // it is a typo (or a tampered form), not a booking.
      unitPence: Math.min(Math.max(Math.round(Number(l.unitPence) || 0), 0), 500_000),
    }))
    .filter((l) => l.description.length > 0)
}

export async function createInvoice(
  input: CreateInvoiceInput
): Promise<ActionResult & { invoiceId?: string; payUrl?: string }> {
  try {
    const { db, userId } = await requireAdmin()

    const lines = cleanLines(input.lines)
    if (lines.length === 0) return { ok: false, message: 'Add at least one line.' }
    if (!METHODS.includes(input.method)) {
      return { ok: false, message: 'Pick a payment method.' }
    }

    const { data: enquiryData, error: enquiryErr } = await db
      .from('booking_requests')
      .select('*')
      .eq('id', input.enquiryId)
      .maybeSingle()
    if (enquiryErr) throw enquiryErr
    if (!enquiryData) return { ok: false, message: 'That enquiry no longer exists.' }
    const enquiry = enquiryData as BookingRequestRow

    const settings = await getSettings()
    const dueOn =
      input.dueOn ||
      new Date(Date.now() + settings.invoiceDueDays * 86_400_000).toISOString().slice(0, 10)

    const { data: created, error: insertErr } = await db
      .from('invoices')
      .insert({
        reference: invoiceReference(),
        enquiry_id: enquiry.id,
        customer_name: enquiry.parent_name,
        customer_email: enquiry.email,
        customer_phone: enquiry.phone,
        child_name: enquiry.child_name,
        status: 'draft',
        payment_method: input.method,
        // Snapshotted from settings, not read live: the bank details printed
        // on a sent invoice must not change under the parent afterwards.
        payment_instructions:
          input.method === 'custom' ? settings.invoiceInstructions || null : null,
        discount_pence: Math.max(Math.round(Number(input.discountPence) || 0), 0),
        due_on: dueOn,
        notes: input.notes?.trim().slice(0, 1000) || null,
        created_by: userId,
      })
      .select('id')
      .single()
    if (insertErr) throw insertErr

    const invoiceId = (created as { id: string }).id

    const { error: itemsErr } = await db.from('invoice_items').insert(
      lines.map((l, i) => ({
        invoice_id: invoiceId,
        description: l.description,
        quantity: l.quantity,
        unit_pence: l.unitPence,
        sort_order: i,
      }))
    )
    if (itemsErr) throw itemsErr

    await recalcInvoiceTotals(db, invoiceId)
    await logInvoiceEvent(db, invoiceId, 'created', `from enquiry ${enquiry.reference}`, userId)

    // Raising an invoice means the conversation has happened.
    if (enquiry.status === 'new') {
      await db.from('booking_requests').update({ status: 'contacted' }).eq('id', enquiry.id)
    }

    if (!input.send) {
      refresh(input.enquiryId)
      return { ok: true, message: 'Draft invoice saved.', invoiceId }
    }

    const sent = await sendInvoice(db, invoiceId, userId)
    refresh(input.enquiryId)
    if (!sent.ok) return { ok: false, message: sent.message, invoiceId }

    return {
      ok: true,
      invoiceId,
      payUrl: sent.payUrl,
      message: sent.mailed
        ? `Invoice emailed to ${enquiry.email}.`
        : 'Invoice created — email is not configured, so copy the link and send it yourself.',
    }
  } catch (err) {
    return fail(err, 'Could not create that invoice.')
  }
}

export async function sendInvoiceNow(
  invoiceId: string
): Promise<ActionResult & { payUrl?: string }> {
  try {
    const { db, userId } = await requireAdmin()
    const res = await sendInvoice(db, invoiceId, userId)
    const invoice = await loadInvoice(db, invoiceId)
    refresh(invoice?.enquiry_id ?? undefined)
    if (!res.ok) return { ok: false, message: res.message }
    return {
      ok: true,
      payUrl: res.payUrl,
      message: res.mailed ? 'Sent.' : 'Email is not configured — copy the link instead.',
    }
  } catch (err) {
    return fail(err, 'Could not send that invoice.')
  }
}

export async function markInvoicePaid(
  invoiceId: string,
  reference: string
): Promise<ActionResult> {
  try {
    const { db, userId } = await requireAdmin()
    const invoice = await loadInvoice(db, invoiceId)
    if (!invoice) return { ok: false, message: 'That invoice no longer exists.' }
    if (invoice.status === 'void') return { ok: false, message: 'That invoice was cancelled.' }

    const res = await settleInvoice(
      db,
      invoiceId,
      invoice.payment_method,
      reference.trim().slice(0, 120) || 'marked paid by hand',
      userId
    )

    // A paid invoice is the moment the enquiry actually converts.
    if (res.newlyPaid && invoice.enquiry_id) {
      await db
        .from('booking_requests')
        .update({ status: 'converted' })
        .eq('id', invoice.enquiry_id)
    }

    refresh(invoice.enquiry_id ?? undefined)
    return {
      ok: true,
      message: res.newlyPaid
        ? 'Marked paid — receipt sent.'
        : 'That invoice was already marked paid.',
    }
  } catch (err) {
    return fail(err, 'Could not mark that invoice paid.')
  }
}

export async function voidInvoice(invoiceId: string): Promise<ActionResult> {
  try {
    const { db, userId } = await requireAdmin()
    const invoice = await loadInvoice(db, invoiceId)
    if (!invoice) return { ok: false, message: 'That invoice no longer exists.' }
    if (invoice.status === 'paid') {
      return { ok: false, message: 'That one is paid. Refund it outside the app first.' }
    }

    const { error } = await db
      .from('invoices')
      .update({ status: 'void', voided_at: new Date().toISOString(), token_hash: null })
      .eq('id', invoiceId)
    if (error) throw error

    await logInvoiceEvent(db, invoiceId, 'voided', undefined, userId)
    refresh(invoice.enquiry_id ?? undefined)
    return { ok: true, message: 'Cancelled. The pay link no longer works.' }
  } catch (err) {
    return fail(err, 'Could not cancel that invoice.')
  }
}
