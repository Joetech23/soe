import 'server-only'

/**
 * Which payment providers this deployment can actually use.
 *
 * Asked of the environment rather than assumed, so the admin panel can grey a
 * method out and say why, instead of offering a button that dead-ends when the
 * parent taps it. Keys are still outstanding at the time of writing — the
 * invoice flow works today with `custom` and gains the other two the moment
 * the variables are set, with no code change.
 */
export type PayMethod = 'custom' | 'stripe' | 'paypal'

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
}

export function paypalApiBase(): string {
  return process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

/** Methods that will work right now, in the order they should be offered. */
export function availableMethods(): PayMethod[] {
  const out: PayMethod[] = []
  if (stripeConfigured()) out.push('stripe')
  if (paypalConfigured()) out.push('paypal')
  out.push('custom')
  return out
}

export const METHOD_LABELS: Record<PayMethod, string> = {
  custom: 'Bank transfer / other',
  stripe: 'Card (Stripe)',
  paypal: 'PayPal',
}
