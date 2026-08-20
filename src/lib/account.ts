import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import type { OrderRow, ProductRow } from '@/lib/supabase/types'

export type LibraryItem = {
  entitlementId: string
  product: ProductRow
  grantedAt: string
  downloadCount: number
  assets: {
    id: string
    label: string | null
    isFile: boolean
  }[]
}

/**
 * Everything the signed-in customer owns.
 *
 * Reads with the service role AFTER establishing identity from the session, so
 * we can join product_assets (which deliberately has no public policy) without
 * exposing storage paths to the browser. The email filter is the authorisation
 * boundary — it comes from the verified session, never from a request param.
 */
export async function getLibrary(): Promise<LibraryItem[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !hasAdminCredentials()) return []

  const db = createAdminClient()
  const email = user.email.toLowerCase()

  const { data: ents } = await db
    .from('entitlements')
    .select('id, product_id, granted_at, download_count')
    .or(`user_id.eq.${user.id},email.eq.${email}`)
    .is('revoked_at', null)
    .order('granted_at', { ascending: false })

  const entitlements = (ents ?? []) as {
    id: string
    product_id: string
    granted_at: string
    download_count: number
  }[]
  if (entitlements.length === 0) return []

  const productIds = entitlements.map((e) => e.product_id)
  const [{ data: products }, { data: assets }] = await Promise.all([
    db.from('products').select('*').in('id', productIds),
    db.from('product_assets').select('id, product_id, label, storage_path, video_id').in('product_id', productIds),
  ])

  const byId = new Map(((products ?? []) as ProductRow[]).map((p) => [p.id, p]))
  const assetRows = (assets ?? []) as {
    id: string
    product_id: string
    label: string | null
    storage_path: string | null
    video_id: string | null
  }[]

  return entitlements
    .filter((e) => byId.has(e.product_id))
    .map((e) => ({
      entitlementId: e.id,
      product: byId.get(e.product_id)!,
      grantedAt: e.granted_at,
      downloadCount: e.download_count,
      assets: assetRows
        .filter((a) => a.product_id === e.product_id)
        .map((a) => ({ id: a.id, label: a.label, isFile: Boolean(a.storage_path) })),
    }))
}

export async function getMyOrders(): Promise<OrderRow[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !hasAdminCredentials()) return []

  const db = createAdminClient()
  const { data } = await db
    .from('orders')
    .select('*')
    .or(`user_id.eq.${user.id},customer_email.eq.${user.email.toLowerCase()}`)
    .order('created_at', { ascending: false })
  return (data ?? []) as OrderRow[]
}

export type ChildInfo = {
  id: string
  name: string
  yearGroup: string | null
  groupName: string | null
  homework: {
    id: string
    title: string
    description: string | null
    /** Ms Betty's optional "what we covered today" note. */
    lessonSummary: string | null
    dueDate: string | null
    filePath: string | null
  }[]
  feedback: { id: string; note: string; lessonDate: string | null; createdAt: string }[]
}

/** The tutoring portal — only populated for parents who redeemed an invite code. */
export async function getMyChildren(): Promise<ChildInfo[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !hasAdminCredentials()) return []

  const db = createAdminClient()
  const { data: kids } = await db
    .from('children')
    .select('id, name, year_group, group_id')
    .eq('parent_user_id', user.id)

  const children = (kids ?? []) as {
    id: string
    name: string
    year_group: string | null
    group_id: string | null
  }[]
  if (children.length === 0) return []

  const out: ChildInfo[] = []
  for (const c of children) {
    const [{ data: group }, { data: hw }, { data: fb }] = await Promise.all([
      c.group_id
        ? db.from('groups').select('name').eq('id', c.group_id).maybeSingle()
        : Promise.resolve({ data: null }),
      db
        .from('homework_items')
        .select('id, title, description, lesson_summary, due_date, file_path')
        .or(`child_id.eq.${c.id}${c.group_id ? `,group_id.eq.${c.group_id}` : ''}`)
        .order('created_at', { ascending: false }),
      db
        .from('feedback_notes')
        .select('id, note, lesson_date, created_at')
        .eq('child_id', c.id)
        .order('created_at', { ascending: false }),
    ])

    out.push({
      id: c.id,
      name: c.name,
      yearGroup: c.year_group,
      groupName: (group as { name: string } | null)?.name ?? null,
      homework: (
        (hw ?? []) as {
          id: string
          title: string
          description: string | null
          lesson_summary: string | null
          due_date: string | null
          file_path: string | null
        }[]
      ).map((h) => ({
        id: h.id,
        title: h.title,
        description: h.description,
        lessonSummary: h.lesson_summary,
        dueDate: h.due_date,
        filePath: h.file_path,
      })),
      feedback: (
        (fb ?? []) as {
          id: string
          note: string
          lesson_date: string | null
          created_at: string
        }[]
      ).map((f) => ({
        id: f.id,
        note: f.note,
        lessonDate: f.lesson_date,
        createdAt: f.created_at,
      })),
    })
  }
  return out
}
