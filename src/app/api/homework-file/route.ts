import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/api-guard'
import { SIGNED_URL_TTL_SECONDS } from '@/lib/downloads'
import { hasRole } from '@/lib/supabase/rpc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Serves a homework attachment to the child's own parent (or to Ms Betty).
 *
 *   GET /api/homework-file?item=<homeworkItemId>
 *
 * The `homework` bucket is private. Authorisation is: the signed-in user must be
 * the `parent_user_id` of a child that this homework is addressed to — either
 * directly (child_id) or via the child's group (group_id). Admins pass too.
 *
 * This is children's data, so we fail closed and never reveal whether an id
 * exists: every rejection returns the same 404.
 */
const deny = () =>
  NextResponse.json({ error: 'Not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })

export async function GET(request: Request) {
  const limited = rateLimit(request, 'homework-file', 40, 60_000)
  if (limited) return limited

  const itemId = new URL(request.url).searchParams.get('item')
  if (!itemId || !hasAdminCredentials()) return deny()

  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return deny()

    const admin = createAdminClient()

    const { data: itemRow } = await admin
      .from('homework_items')
      .select('id, file_path, child_id, group_id')
      .eq('id', itemId)
      .maybeSingle()

    const item = itemRow as {
      file_path: string | null
      child_id: string | null
      group_id: string | null
    } | null
    if (!item?.file_path) return deny()

    // Admins can always fetch; parents must own a matching child.
    let allowed = await hasRole(supabase, user.id, 'admin')

    if (!allowed) {
      const { data: kids } = await admin
        .from('children')
        .select('id, group_id')
        .eq('parent_user_id', user.id)

      allowed = ((kids ?? []) as { id: string; group_id: string | null }[]).some(
        (c) =>
          (item.child_id && item.child_id === c.id) ||
          (item.group_id && c.group_id && item.group_id === c.group_id)
      )
    }
    if (!allowed) return deny()

    const { data: signed, error } = await admin.storage
      .from('homework')
      .createSignedUrl(item.file_path, SIGNED_URL_TTL_SECONDS, { download: true })

    if (error || !signed?.signedUrl) return deny()

    return NextResponse.redirect(signed.signedUrl, {
      status: 302,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (err) {
    console.error('[homework-file]', err)
    return deny()
  }
}
