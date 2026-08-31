import { NextResponse } from 'next/server'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { rateLimit, readJson, badRequest, serverError, sameOrigin } from '@/lib/api-guard'
import { invoiceByToken, invoiceSummary, logInvoiceEvent, isPayable } from '@/lib/invoices'
import { createInvoiceCheckout } from '@/lib/payments/stripe'
import { createInvoiceOrder } from '@/lib/payments/paypal'
import { stripeConfigured, paypalConfigured } from '@/lib/payments/config'
import { siteUrl } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Start a payment for one invoice.
 *
 * The raw link token is the only credential, exactly as with download links —
 * there is no sign-in on this page, because a parent paying a £25 invoice
 * should not have to make an account first. The amount is read from the
 * database here and never accepted from the browser.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return badRequest(
      'We could not verify that request came from this page. Please refresh and try again.',
      403
    )
  }
  const limited = rateLimit(request, 'invoice-checkout', 10, 60_000)
  if (limited) return limited

  const json = (await readJson(request)) as { token?: unknown } | null
  if (!json) return badRequest('Invalid request.')

  const token = typeof json.token === 'string' ? json.token : ''
  if (!token) return badRequest('This payment link is not valid.')

  if (!hasAdminCredentials()) {
    return NextResponse.json({ error: 'Payments are being set up.' }, { status: 503 })
  }

  try {
    const db = createAdminClient()
    const invoice = await invoiceByToken(db, token)
    if (!invoice) return badRequest('This payment link is not valid.', 404)
    if (invoice.status === 'paid') {
      return badRequest('This invoice has already been paid. Thank you!')
    }
    if (!isPayable(invoice)) return badRequest('This invoice was cancelled.')

    const description = `Invoice ${invoice.reference} — ${invoiceSummary(invoice)}`
    const returnBase = `/api/invoice/return?t=${encodeURIComponent(token)}`
    const cancelUrl = siteUrl(`/pay/${token}?cancelled=1`)

    if (invoice.payment_method === 'stripe') {
      if (!stripeConfigured()) {
        return badRequest('Card payments are not switched on yet.', 503)
      }
      const session = await createInvoiceCheckout({
        reference: invoice.reference,
        description,
        amountPence: invoice.total_pence,
        customerEmail: invoice.customer_email,
        successUrl: siteUrl(`${returnBase}&provider=stripe&session_id={CHECKOUT_SESSION_ID}`),
        cancelUrl,
      })
      if (!session.url) throw new Error('Stripe did not return a checkout URL.')

      await db
        .from('invoices')
        .update({ provider_session_id: session.id })
        .eq('id', invoice.id)
      await logInvoiceEvent(db, invoice.id, 'note', 'card checkout started')

      return NextResponse.json({ url: session.url })
    }

    if (invoice.payment_method === 'paypal') {
      if (!paypalConfigured()) {
        return badRequest('PayPal is not switched on yet.', 503)
      }
      const order = await createInvoiceOrder({
        reference: invoice.reference,
        description,
        amountPence: invoice.total_pence,
        returnUrl: siteUrl(`${returnBase}&provider=paypal`),
        cancelUrl,
      })

      await db.from('invoices').update({ provider_session_id: order.id }).eq('id', invoice.id)
      await logInvoiceEvent(db, invoice.id, 'note', 'PayPal checkout started')

      return NextResponse.json({ url: order.approveUrl })
    }

    // 'custom' — there is nothing to redirect to; the page shows bank details.
    return badRequest('This invoice is paid by bank transfer.')
  } catch (err) {
    return serverError('invoice-checkout', err)
  }
}
