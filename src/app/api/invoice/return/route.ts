import { NextResponse } from 'next/server'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { invoiceByToken, invoicePayUrl, settleInvoice } from '@/lib/invoices'
import { retrieveSession } from '@/lib/payments/stripe'
import { captureInvoiceOrder } from '@/lib/payments/paypal'
import { siteUrl } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Where the provider sends the parent back to.
 *
 * The URL is treated as a hint, never as proof: a Stripe session is read back
 * from Stripe and a PayPal order is captured server-side before anything is
 * marked paid. Someone who guesses this URL settles nothing.
 *
 * Our own link token is `t`, not `token` — PayPal appends its own `token`
 * parameter on the way back, and the two would collide.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const raw = url.searchParams.get('t') ?? ''
  const provider = url.searchParams.get('provider')

  const back = (query: string) =>
    NextResponse.redirect(raw ? `${invoicePayUrl(raw)}${query}` : siteUrl('/'))

  if (!raw || !hasAdminCredentials()) return back('')

  try {
    const db = createAdminClient()
    const invoice = await invoiceByToken(db, raw)
    if (!invoice) return NextResponse.redirect(siteUrl('/'))
    if (invoice.status === 'paid') return back('?paid=1')

    if (provider === 'stripe') {
      const sessionId = url.searchParams.get('session_id')
      if (!sessionId) return back('?error=1')

      const session = await retrieveSession(sessionId)
      // Belt and braces: the session must be the one we started for THIS
      // invoice, not a valid session for somebody else's.
      if (invoice.provider_session_id && session.id !== invoice.provider_session_id) {
        console.warn(`[invoice-return] session mismatch on ${invoice.reference}`)
        return back('?error=1')
      }
      if (session.payment_status !== 'paid') return back('?pending=1')

      await settleInvoice(
        db,
        invoice.id,
        'stripe',
        session.payment_intent ?? session.id,
        null,
        invoicePayUrl(raw)
      )
      return back('?paid=1')
    }

    if (provider === 'paypal') {
      const orderId = url.searchParams.get('token') ?? invoice.provider_session_id
      if (!orderId) return back('?error=1')
      if (invoice.provider_session_id && orderId !== invoice.provider_session_id) {
        console.warn(`[invoice-return] PayPal order mismatch on ${invoice.reference}`)
        return back('?error=1')
      }

      const capture = await captureInvoiceOrder(orderId)
      if (!capture.ok) return back('?pending=1')

      await settleInvoice(
        db,
        invoice.id,
        'paypal',
        capture.captureId ?? orderId,
        null,
        invoicePayUrl(raw)
      )
      return back('?paid=1')
    }

    return back('')
  } catch (err) {
    console.error('[invoice-return]', err)
    return back('?error=1')
  }
}
