import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import {
  rateLimit,
  readJson,
  badRequest,
  serverError,
  sameOrigin,
} from '@/lib/api-guard'
import { email as emailSchema, name as nameSchema, honeypot } from '@/lib/schemas'
import { settleFreeOrder, sendOrderReceipt, mintOrderToken, orderDownloadUrl } from '@/lib/fulfilment'
import type { OrderRow } from '@/lib/supabase/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TERMS_VERSION = 'v1'

const checkoutSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  /** Client sends product IDs only — never prices. */
  productIds: z.array(z.string().uuid()).min(1, 'Your basket is empty.').max(20),
  /** Consumer Contracts Regs 2013: express consent to immediate supply. */
  digitalConsent: z.literal(true, {
    errorMap: () => ({
      message:
        'Please confirm you want your files straight away and understand the 14-day cancellation right does not apply.',
    }),
  }),
  marketingConsent: z.boolean().default(false),
  billingCountry: z.string().length(2).default('GB'),
  provider: z.enum(['stripe', 'paypal']).optional(),
  company: honeypot,
})

export async function POST(request: Request) {
  if (!sameOrigin(request)) return badRequest('Invalid request origin.', 403)
  const limited = rateLimit(request, 'orders', 10, 60_000)
  if (limited) return limited

  const json = await readJson(request)
  if (json === null) return badRequest('Invalid request.')

  const parsed = checkoutSchema.safeParse(json)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Please check the form.')
  }
  const d = parsed.data
  if (d.company) return NextResponse.json({ ok: true })

  if (!hasAdminCredentials()) {
    return NextResponse.json(
      { error: 'Checkout is being set up. Please try again shortly.' },
      { status: 503 }
    )
  }

  try {
    const db = createAdminClient()

    // Prices, availability and duplicate-ownership are ALL resolved inside the
    // RPC. The client's only influence is which product ids it names.
    const { data: created, error } = await db.rpc('create_order', {
      p_items: d.productIds.map((id) => ({ product_id: id })),
      p_customer_name: d.name,
      p_customer_email: d.email.trim().toLowerCase(),
      p_marketing_consent: d.marketingConsent,
      p_billing_country: d.billingCountry.toUpperCase(),
      p_terms_version: TERMS_VERSION,
      p_source: 'web',
    } as never)

    if (error) {
      const msg = error.message ?? ''
      if (/ALREADY_OWNED/.test(msg)) {
        return badRequest('You already own everything in your basket.', 409)
      }
      if (/EMPTY_CART/.test(msg)) return badRequest('Your basket is empty.')
      if (/PRODUCT_UNAVAILABLE/.test(msg)) {
        return badRequest('One of those resources is no longer available.')
      }
      throw error
    }

    const order = created as OrderRow | null
    if (!order) throw new Error('order not created')

    // ── Zero-total: never touch a payment provider (Stripe rejects £0). ──────
    if (order.total_pence === 0) {
      const { data: firstItem } = await db
        .from('order_items')
        .select('product_name')
        .eq('order_id', order.id)
        .limit(1)
        .maybeSingle()

      const { downloadUrl } = await settleFreeOrder(
        db,
        order,
        (firstItem as { product_name: string } | null)?.product_name ?? 'your resources'
      )
      return NextResponse.json({
        ok: true,
        free: true,
        reference: order.order_number,
        redirectUrl: downloadUrl,
      })
    }

    // ── Paid: hand off to a provider. ───────────────────────────────────────
    // Stripe/PayPal are not configured yet. Rather than silently failing, the
    // order is already safely recorded as pending_payment, so nothing is lost
    // and it can be completed the moment keys land.
    const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY)
    const paypalReady = Boolean(
      process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
    )

    if (!stripeReady && !paypalReady) {
      return NextResponse.json(
        {
          ok: false,
          pending: true,
          reference: order.order_number,
          error:
            'Card payments are being switched on right now. Your order is saved — Ms Betty will email you a payment link shortly.',
        },
        { status: 503 }
      )
    }

    // Provider integration lands with the keys; the order row is already
    // created so the webhook has something to settle against.
    return NextResponse.json({
      ok: false,
      pending: true,
      reference: order.order_number,
      error: 'Payment provider not yet connected.',
    }, { status: 503 })
  } catch (err) {
    return serverError('orders', err)
  }
}

/** Re-send a receipt/download link for an existing paid order (admin utility). */
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return badRequest('Invalid request origin.', 403)
  const limited = rateLimit(request, 'orders-reissue', 5, 60_000)
  if (limited) return limited
  if (!hasAdminCredentials()) return badRequest('Not configured.', 503)

  const json = (await readJson(request)) as { reference?: string } | null
  if (!json?.reference) return badRequest('Missing reference.')

  try {
    const db = createAdminClient()
    const { data } = await db
      .from('orders')
      .select('*')
      .eq('order_number', json.reference.toUpperCase())
      .maybeSingle()
    if (!data) return badRequest('Order not found.', 404)

    const order = data as OrderRow
    if (order.payment_status !== 'paid') {
      return badRequest('That order is not paid.', 409)
    }
    const raw = await mintOrderToken(db, order)
    return NextResponse.json({
      ok: true,
      downloadUrl: orderDownloadUrl(order.order_number, raw),
    })
  } catch (err) {
    return serverError('orders-reissue', err)
  }
}
