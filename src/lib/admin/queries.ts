import 'server-only'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import type { OrderRow, ProductRow, CustomerRow } from '@/lib/supabase/types'

/**
 * Admin dashboard reads.
 *
 * Service role, because the admin panel legitimately needs to see every order,
 * customer and entitlement. Access is gated before this ever runs: middleware
 * checks the admin role, and the (dash) layout re-checks server-side.
 */

export type DashStats = {
  revenuePence: number
  orders: number
  downloads: number
  subscribers: number
  enquiries: number
}

export async function getStats(): Promise<DashStats> {
  if (!hasAdminCredentials()) {
    return { revenuePence: 0, orders: 0, downloads: 0, subscribers: 0, enquiries: 0 }
  }
  const db = createAdminClient()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [paid, orders, downloads, subs, enquiries] = await Promise.all([
    db
      .from('orders')
      .select('total_pence')
      .eq('payment_status', 'paid')
      .gte('paid_at', monthStart.toISOString()),
    db.from('orders').select('id', { count: 'exact', head: true }),
    db.from('download_events').select('id', { count: 'exact', head: true }),
    db
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed'),
    db
      .from('booking_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
  ])

  return {
    revenuePence: (paid.data ?? []).reduce(
      (sum, o) => sum + ((o as { total_pence: number }).total_pence ?? 0),
      0
    ),
    orders: orders.count ?? 0,
    downloads: downloads.count ?? 0,
    subscribers: subs.count ?? 0,
    enquiries: enquiries.count ?? 0,
  }
}

export async function getRecentOrders(limit = 6): Promise<OrderRow[]> {
  if (!hasAdminCredentials()) return []
  const db = createAdminClient()
  const { data } = await db
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as OrderRow[]
}

export type AdminProduct = ProductRow & { sales: number }

export async function getProductsWithSales(): Promise<AdminProduct[]> {
  if (!hasAdminCredentials()) return []
  const db = createAdminClient()
  const [{ data: products }, { data: items }] = await Promise.all([
    db.from('products').select('*').order('sort_order'),
    db.from('order_items').select('product_id'),
  ])

  const counts = new Map<string, number>()
  for (const i of (items ?? []) as { product_id: string | null }[]) {
    if (i.product_id) counts.set(i.product_id, (counts.get(i.product_id) ?? 0) + 1)
  }

  return ((products ?? []) as ProductRow[]).map((p) => ({
    ...p,
    sales: counts.get(p.id) ?? 0,
  }))
}

export async function getCustomers(limit = 50): Promise<CustomerRow[]> {
  if (!hasAdminCredentials()) return []
  const db = createAdminClient()
  const { data } = await db
    .from('customers')
    .select('*')
    .order('last_seen_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as CustomerRow[]
}

export async function getAllOrders(limit = 100): Promise<OrderRow[]> {
  if (!hasAdminCredentials()) return []
  const db = createAdminClient()
  const { data } = await db
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as OrderRow[]
}
