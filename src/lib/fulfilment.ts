import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, OrderRow } from '@/lib/supabase/types'
import { mintToken, hashToken, TOKEN_TTL_DAYS } from '@/lib/downloads'
import { sendEmail, redact } from '@/lib/email/send'
import {
  freeDownloadEmail,
  orderReceiptEmail,
  ownerSaleEmail,
} from '@/lib/email/templates'
import { getSettings } from '@/lib/settings'
import { siteUrl } from '@/lib/utils'
import { site } from '@/lib/site'

/**
 * Tells Ms Betty a sale (or free download) happened. Never throws — the
 * customer's delivery must not depend on the owner's notification.
 */
async function notifyOwner(db: Admin, order: OrderRow) {
  try {
    if (!(await getSettings()).notifyOwnerSale) return

    const { data: items } = await db
      .from('order_items')
      .select('product_name, unit_price_pence')
      .eq('order_id', order.id)

    const mail = ownerSaleEmail({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      items: ((items ?? []) as { product_name: string; unit_price_pence: number }[]).map(
        (i) => ({ name: i.product_name, pricePence: i.unit_price_pence })
      ),
      totalPence: order.total_pence,
      isFree: order.total_pence === 0,
    })

    await sendEmail({
      to: process.env.OWNER_NOTIFICATION_EMAIL ?? site.contact.email,
      replyTo: order.customer_email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      tag: 'owner-sale',
    })
  } catch (err) {
    console.warn('[fulfilment] owner notification failed', err)
  }
}

type Admin = SupabaseClient<Database>

/**
 * Mints a 30-day guest download token for an order and returns the raw value.
 * Only the SHA-256 hash is persisted.
 */
export async function mintOrderToken(db: Admin, order: OrderRow): Promise<string> {
  const raw = mintToken()
  const expires = new Date(Date.now() + TOKEN_TTL_DAYS * 86_400_000).toISOString()
  const { error } = await db.from('download_tokens').insert({
    token_hash: hashToken(raw),
    order_id: order.id,
    email: order.customer_email,
    expires_at: expires,
  })
  if (error) throw error
  return raw
}

/** Where a customer lands to collect their files. */
export function orderDownloadUrl(orderNumber: string, rawToken: string) {
  return siteUrl(
    `/order/${encodeURIComponent(orderNumber)}?t=${encodeURIComponent(rawToken)}`
  )
}

/**
 * Ensures the buyer has an auth account so their purchases are permanently
 * re-downloadable. Never throws — an auth hiccup must not cost them their
 * files, and the guest token already works regardless.
 */
export async function ensureAccount(db: Admin, email: string, fullName?: string | null) {
  try {
    const { error } = await db.auth.admin.createUser({
      email,
      email_confirm: true, // they proved control of the address by using it
      user_metadata: { full_name: fullName ?? null, created_via: 'purchase' },
    })
    // "already registered" is the normal path for a returning customer.
    if (error && !/already/i.test(error.message)) {
      console.warn('[fulfilment] account create:', error.message)
    }
  } catch (err) {
    console.warn('[fulfilment] account create threw', err)
  }
}

/**
 * Settles a zero-total (free) order: marks it paid, which grants entitlements,
 * then mints a token and emails the download link.
 *
 * `mark_order_paid` is atomic and returns newly_paid=false if something already
 * settled this order, so a duplicate submit cannot send two emails.
 */
export async function settleFreeOrder(
  db: Admin,
  order: OrderRow,
  productName: string
): Promise<{ downloadUrl: string; alreadySettled: boolean }> {
  const { data, error } = await db.rpc('mark_order_paid', {
    p_order_number: order.order_number,
    p_provider: 'none',
  } as never)
  if (error) throw error

  const row = (data as { order_id: string; newly_paid: boolean }[] | null)?.[0]
  const raw = await mintOrderToken(db, order)
  const downloadUrl = orderDownloadUrl(order.order_number, raw)

  if (!row?.newly_paid) {
    return { downloadUrl, alreadySettled: true }
  }

  await ensureAccount(db, order.customer_email, order.customer_name)

  const mail = freeDownloadEmail({
    name: order.customer_name,
    productName,
    downloadUrl,
  })
  const res = await sendEmail({
    to: order.customer_email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    tag: 'free-download',
  })

  if (res.status === 'sent') {
    await db
      .from('orders')
      .update({ receipt_sent_at: new Date().toISOString() })
      .eq('id', order.id)
  }
  await notifyOwner(db, order)
  console.info(
    `[fulfilment] free order ${order.order_number} → ${redact(order.customer_email)} (${res.status})`
  )

  return { downloadUrl, alreadySettled: false }
}

/**
 * Sends the receipt for a PAID order. Called only by the caller that won the
 * atomic mark_order_paid race, so it can never double-send.
 */
export async function sendOrderReceipt(db: Admin, orderId: string) {
  const { data: order } = await db
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return
  const o = order as OrderRow
  if (o.receipt_sent_at) return // belt and braces

  const { data: items } = await db
    .from('order_items')
    .select('product_name, unit_price_pence')
    .eq('order_id', orderId)

  const raw = await mintOrderToken(db, o)
  await ensureAccount(db, o.customer_email, o.customer_name)

  const mail = orderReceiptEmail({
    name: o.customer_name,
    orderNumber: o.order_number,
    items: ((items ?? []) as { product_name: string; unit_price_pence: number }[]).map(
      (i) => ({ name: i.product_name, pricePence: i.unit_price_pence })
    ),
    totalPence: o.total_pence,
    downloadUrl: orderDownloadUrl(o.order_number, raw),
  })

  const res = await sendEmail({
    to: o.customer_email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    tag: 'order-receipt',
  })

  if (res.status === 'sent') {
    await db
      .from('orders')
      .update({ receipt_sent_at: new Date().toISOString() })
      .eq('id', orderId)
  }
  await notifyOwner(db, o)
}
