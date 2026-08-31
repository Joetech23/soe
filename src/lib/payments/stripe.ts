import 'server-only'
import { stripeConfigured } from './config'

/**
 * Stripe over plain fetch.
 *
 * No SDK: the two calls this app makes are a form-encoded POST and a GET, and
 * a dependency that ships its own HTTP client, retry logic and type surface is
 * a poor trade for that. It also keeps the route deployable on any runtime.
 */

const API = 'https://api.stripe.com/v1'

function form(params: Record<string, string | number | undefined>): string {
  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') body.set(k, String(v))
  }
  return body.toString()
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Stripe is not configured.')

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  })

  const json = (await res.json()) as T & { error?: { message?: string } }
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Stripe returned ${res.status}.`)
  }
  return json
}

export type StripeSession = {
  id: string
  url: string | null
  payment_status: 'paid' | 'unpaid' | 'no_payment_required'
  amount_total: number | null
  payment_intent: string | null
}

/**
 * A hosted checkout page for one invoice.
 *
 * The whole invoice is a single line item on purpose. Splitting it would let
 * the totals on the Stripe page and the invoice drift apart through rounding,
 * and the parent already has the breakdown in front of them.
 */
export async function createInvoiceCheckout(args: {
  reference: string
  description: string
  amountPence: number
  customerEmail: string
  successUrl: string
  cancelUrl: string
}): Promise<StripeSession> {
  if (!stripeConfigured()) throw new Error('Stripe is not configured.')

  return call<StripeSession>('/checkout/sessions', {
    method: 'POST',
    body: form({
      mode: 'payment',
      'line_items[0][quantity]': 1,
      'line_items[0][price_data][currency]': 'gbp',
      'line_items[0][price_data][unit_amount]': args.amountPence,
      'line_items[0][price_data][product_data][name]': args.description,
      customer_email: args.customerEmail,
      client_reference_id: args.reference,
      'metadata[kind]': 'invoice',
      'metadata[reference]': args.reference,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
    }),
  })
}

/** Read a session back so payment is confirmed by Stripe, never by the URL. */
export async function retrieveSession(id: string): Promise<StripeSession> {
  return call<StripeSession>(`/checkout/sessions/${encodeURIComponent(id)}`)
}
