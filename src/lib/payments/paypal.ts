import 'server-only'
import { paypalApiBase, paypalConfigured } from './config'

/**
 * PayPal Orders v2 over plain fetch.
 *
 * Redirect-and-capture with no webhook is safe here for the same reason it is
 * in the shop: PayPal only moves money when *we* call capture, so an approval
 * the parent abandons never charges them — the invoice simply stays unpaid.
 */

type TokenResponse = { access_token: string; expires_in: number }

let cached: { token: string; expiresAt: number } | null = null

async function accessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!id || !secret) throw new Error('PayPal is not configured.')

  // Tokens last hours; re-minting one per click is a needless round trip.
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token

  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status}).`)

  const json = (await res.json()) as TokenResponse
  cached = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  }
  return json.access_token
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await accessToken()
  const res = await fetch(`${paypalApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  })
  const json = (await res.json().catch(() => ({}))) as T & { message?: string }
  if (!res.ok) throw new Error(json.message ?? `PayPal returned ${res.status}.`)
  return json
}

type PayPalOrder = {
  id: string
  status: string
  links?: { rel: string; href: string }[]
  purchase_units?: { payments?: { captures?: { id: string; status: string }[] } }[]
}

export async function createInvoiceOrder(args: {
  reference: string
  description: string
  amountPence: number
  returnUrl: string
  cancelUrl: string
}): Promise<{ id: string; approveUrl: string }> {
  if (!paypalConfigured()) throw new Error('PayPal is not configured.')

  const order = await call<PayPalOrder>('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: args.reference,
          custom_id: args.reference,
          description: args.description.slice(0, 127),
          amount: {
            currency_code: 'GBP',
            value: (args.amountPence / 100).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'Spirit of Excellence Tuition',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
        return_url: args.returnUrl,
        cancel_url: args.cancelUrl,
      },
    }),
  })

  const approve = order.links?.find((l) => l.rel === 'approve')?.href
  if (!approve) throw new Error('PayPal did not return an approval link.')
  return { id: order.id, approveUrl: approve }
}

/**
 * Capture an approved order.
 *
 * A second capture of the same order is rejected by PayPal with
 * ORDER_ALREADY_CAPTURED — treated as success here, because it means the money
 * did arrive and only our record is behind.
 */
export async function captureInvoiceOrder(
  orderId: string
): Promise<{ ok: boolean; captureId: string | null }> {
  try {
    const res = await call<PayPalOrder>(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      { method: 'POST', body: '{}' }
    )
    const capture = res.purchase_units?.[0]?.payments?.captures?.[0]
    return { ok: res.status === 'COMPLETED', captureId: capture?.id ?? null }
  } catch (err) {
    if (err instanceof Error && /ALREADY_CAPTURED/i.test(err.message)) {
      return { ok: true, captureId: null }
    }
    throw err
  }
}
