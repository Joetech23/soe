'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { hasRole } from '@/lib/supabase/rpc'
import { formatMoney } from '@/lib/utils'

/**
 * Data for the admin topbar: search and the notification bell.
 *
 * Both re-verify the admin role. A server action is a callable endpoint in its
 * own right — the layout guard says nothing about who may invoke these.
 */

async function requireAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')
  if (!(await hasRole(supabase, user.id, 'admin'))) throw new Error('Not authorised.')
  if (!hasAdminCredentials()) throw new Error('Server not configured.')
  return createAdminClient()
}

/* ========================================================================== */
/*  Search                                                                    */
/* ========================================================================== */

export type SearchHit = {
  id: string
  group: 'Orders' | 'Products' | 'Customers' | 'Children' | 'Enquiries'
  title: string
  detail: string
  href: string
}

/** Escape PostgREST `or`/`ilike` metacharacters so a stray comma or paren in
 *  the query cannot break — or reshape — the filter expression. */
function safeTerm(raw: string): string {
  return raw.replace(/[,().*%\\]/g, ' ').trim().slice(0, 60)
}

export async function adminSearch(queryRaw: string): Promise<SearchHit[]> {
  const q = safeTerm(queryRaw)
  if (q.length < 2) return []

  let db
  try {
    db = await requireAdmin()
  } catch {
    return []
  }

  const like = `%${q}%`
  const hits: SearchHit[] = []

  const [orders, products, customers, children, enquiries] = await Promise.allSettled([
    db
      .from('orders')
      .select('id, order_number, customer_name, customer_email, total_pence, payment_status')
      .or(`order_number.ilike.${like},customer_email.ilike.${like},customer_name.ilike.${like}`)
      .order('created_at', { ascending: false })
      .limit(5),
    db
      .from('products')
      .select('id, name, slug, price_pence, is_free')
      .ilike('name', like)
      .limit(5),
    db
      .from('customers')
      .select('id, email, full_name')
      .or(`email.ilike.${like},full_name.ilike.${like}`)
      .limit(5),
    db.from('children').select('id, name, year_group').ilike('name', like).limit(5),
    db
      .from('booking_requests')
      .select('id, parent_name, email, child_name, status')
      .or(`parent_name.ilike.${like},email.ilike.${like},child_name.ilike.${like}`)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (orders.status === 'fulfilled') {
    for (const o of orders.value.data ?? []) {
      hits.push({
        id: `o-${o.id}`,
        group: 'Orders',
        title: o.order_number,
        detail: `${o.customer_name || o.customer_email} · ${formatMoney(o.total_pence)} · ${o.payment_status}`,
        href: `/admin/orders?q=${encodeURIComponent(o.order_number)}`,
      })
    }
  }
  if (products.status === 'fulfilled') {
    for (const p of products.value.data ?? []) {
      hits.push({
        id: `p-${p.id}`,
        group: 'Products',
        title: p.name,
        detail: p.is_free ? 'Free resource' : formatMoney(p.price_pence),
        href: `/admin/products?edit=${p.id}`,
      })
    }
  }
  if (customers.status === 'fulfilled') {
    for (const c of customers.value.data ?? []) {
      hits.push({
        id: `c-${c.id}`,
        group: 'Customers',
        title: c.full_name || c.email,
        detail: c.full_name ? c.email : 'Customer',
        href: `/admin/customers?q=${encodeURIComponent(c.email)}`,
      })
    }
  }
  if (children.status === 'fulfilled') {
    for (const k of children.value.data ?? []) {
      hits.push({
        id: `k-${k.id}`,
        group: 'Children',
        title: k.name,
        detail: k.year_group ?? 'On the register',
        href: '/admin/children',
      })
    }
  }
  if (enquiries.status === 'fulfilled') {
    for (const e of enquiries.value.data ?? []) {
      hits.push({
        id: `e-${e.id}`,
        group: 'Enquiries',
        title: e.parent_name || e.email,
        detail: `${e.child_name ? `${e.child_name} · ` : ''}${e.email} · ${e.status}`,
        href: '/admin/enquiries',
      })
    }
  }

  return hits.slice(0, 18)
}

/* ========================================================================== */
/*  Notifications                                                             */
/* ========================================================================== */

export type Notification = {
  id: string
  kind: 'enquiry' | 'order' | 'subscriber' | 'parent'
  title: string
  detail: string
  href: string
  at: string
}

/**
 * What needs Ms Betty's attention.
 *
 * "Unread" is derived from the data itself — a new enquiry, a recent order —
 * rather than tracked per-notification. There is one admin, so a read/unread
 * table would be machinery around a number she can already see, and an enquiry
 * stops being new the moment she marks it handled on its own page.
 */
export async function getNotifications(): Promise<Notification[]> {
  let db
  try {
    db = await requireAdmin()
  } catch {
    return []
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const out: Notification[] = []

  const [enquiries, orders, subs, parents] = await Promise.allSettled([
    db
      .from('booking_requests')
      .select('id, parent_name, email, year_group, created_at')
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(8),
    db
      .from('orders')
      .select('id, order_number, customer_name, customer_email, total_pence, paid_at')
      .eq('payment_status', 'paid')
      .gte('paid_at', weekAgo)
      .order('paid_at', { ascending: false })
      .limit(6),
    db
      .from('newsletter_subscribers')
      .select('id, email, created_at')
      .eq('status', 'confirmed')
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: false })
      .limit(4),
    db
      .from('children')
      .select('id, name, parent_user_id, created_at')
      .not('parent_user_id', 'is', null)
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  if (enquiries.status === 'fulfilled') {
    for (const e of enquiries.value.data ?? []) {
      out.push({
        id: `e-${e.id}`,
        kind: 'enquiry',
        title: 'New enquiry',
        detail: `${e.parent_name || e.email}${e.year_group ? ` · ${e.year_group}` : ''}`,
        href: '/admin/enquiries',
        at: e.created_at,
      })
    }
  }
  if (orders.status === 'fulfilled') {
    for (const o of orders.value.data ?? []) {
      // The query filters on paid_at, so it is always set here — but the column
      // is nullable, and skipping the row beats inventing a timestamp.
      if (!o.paid_at) continue
      out.push({
        id: `o-${o.id}`,
        kind: 'order',
        title: o.total_pence === 0 ? 'Free download' : `Sale · ${formatMoney(o.total_pence)}`,
        detail: `${o.order_number} · ${o.customer_name || o.customer_email}`,
        href: `/admin/orders?q=${encodeURIComponent(o.order_number)}`,
        at: o.paid_at,
      })
    }
  }
  if (subs.status === 'fulfilled') {
    for (const s of subs.value.data ?? []) {
      out.push({
        id: `s-${s.id}`,
        kind: 'subscriber',
        title: 'New subscriber',
        detail: s.email,
        href: '/admin/subscribers',
        at: s.created_at,
      })
    }
  }
  if (parents.status === 'fulfilled') {
    for (const c of parents.value.data ?? []) {
      out.push({
        id: `k-${c.id}`,
        kind: 'parent',
        title: 'Parent linked',
        detail: `${c.name}'s parent joined the portal`,
        href: '/admin/children',
        at: c.created_at,
      })
    }
  }

  return out
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 12)
}

/**
 * Just the badge number, rendered server-side so it is correct on first paint.
 *
 * Counts exactly the four things `getNotifications` lists — head-only queries,
 * so no rows cross the wire. Counting a different set would show a badge of 2
 * that opens onto a panel saying "3 new", which is the sort of small
 * inconsistency that makes people stop trusting the number.
 */
export async function getNotificationCount(): Promise<number> {
  let db
  try {
    db = await requireAdmin()
  } catch {
    return 0
  }
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const head = { count: 'exact' as const, head: true }

  const results = await Promise.allSettled([
    db.from('booking_requests').select('id', head).eq('status', 'new'),
    db
      .from('orders')
      .select('id', head)
      .eq('payment_status', 'paid')
      .gte('paid_at', weekAgo),
    db
      .from('newsletter_subscribers')
      .select('id', head)
      .eq('status', 'confirmed')
      .gte('created_at', weekAgo),
    db
      .from('children')
      .select('id', head)
      .not('parent_user_id', 'is', null)
      .gte('created_at', weekAgo),
  ])

  const total = results.reduce(
    (sum, r) => sum + (r.status === 'fulfilled' ? (r.value.count ?? 0) : 0),
    0
  )
  // The panel shows at most 12; never promise more than it can display.
  return Math.min(total, 12)
}
