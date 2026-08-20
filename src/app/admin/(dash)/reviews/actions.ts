'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { hasRole } from '@/lib/supabase/rpc'

export type ActionResult = { ok: boolean; message: string }

async function requireAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')
  if (!(await hasRole(supabase, user.id, 'admin'))) throw new Error('Not authorised.')
  if (!hasAdminCredentials()) throw new Error('Server not configured.')
  return { db: createAdminClient(), userId: user.id }
}

/** Both the admin list and the two public pages that render approved reviews. */
function refresh() {
  revalidatePath('/admin/reviews')
  revalidatePath('/testimonials')
  revalidatePath('/')
}

export async function setReviewStatus(
  id: string,
  status: 'approved' | 'rejected' | 'pending'
): Promise<ActionResult> {
  try {
    const { db, userId } = await requireAdmin()
    const { error } = await db
      .from('reviews')
      .update({
        status,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
        approved_by: status === 'approved' ? userId : null,
        // A rejected review must never stay featured.
        ...(status === 'approved' ? {} : { featured: false }),
      })
      .eq('id', id)
    if (error) throw error
    refresh()
    return {
      ok: true,
      message:
        status === 'approved'
          ? 'Published — it is on the site now.'
          : status === 'rejected'
            ? 'Hidden. It stays here in case you change your mind.'
            : 'Moved back to pending.',
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not update.' }
  }
}

export async function setReviewFeatured(id: string, featured: boolean): Promise<ActionResult> {
  try {
    const { db } = await requireAdmin()
    // Featuring shows it in the large top row, which only makes sense once
    // the review is actually public.
    const { data: row } = await db.from('reviews').select('status').eq('id', id).maybeSingle()
    if (featured && row?.status !== 'approved') {
      return { ok: false, message: 'Approve it first, then you can feature it.' }
    }
    const { error } = await db.from('reviews').update({ featured }).eq('id', id)
    if (error) throw error
    refresh()
    return { ok: true, message: featured ? 'Featured at the top.' : 'No longer featured.' }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not update.' }
  }
}

export async function deleteReview(id: string): Promise<ActionResult> {
  try {
    const { db } = await requireAdmin()
    const { error } = await db.from('reviews').delete().eq('id', id)
    if (error) throw error
    refresh()
    return { ok: true, message: 'Review deleted.' }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not delete.' }
  }
}
