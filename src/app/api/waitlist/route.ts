import { NextResponse } from 'next/server'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { rateLimit, readJson, sameOrigin, badRequest, serverError } from '@/lib/api-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Join the waiting list for a full class.
 *
 * Re-applying for the same group with the same address updates the existing
 * entry rather than adding a second one: a parent who submits the form twice
 * should not appear twice, and should not lose their place either.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return badRequest('Bad request', 403)

  const limited = rateLimit(request, 'waitlist', 5, 60 * 60 * 1000)
  if (limited) return limited

  const body = (await readJson(request)) as Record<string, unknown> | null
  if (!body) return badRequest('Invalid request body')

  // Honeypot — answer normally so a bot learns nothing.
  if (typeof body.website === 'string' && body.website.length > 0) {
    return NextResponse.json({ ok: true, message: 'You are on the list.' })
  }

  const groupId = String(body.groupId ?? '').trim()
  const parentName = String(body.parentName ?? '').trim().slice(0, 80)
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 254)
  const phone = String(body.phone ?? '').trim().slice(0, 30) || null
  const childName = String(body.childName ?? '').trim().slice(0, 80) || null
  const notes = String(body.notes ?? '').trim().slice(0, 500) || null

  if (!/^[0-9a-f-]{36}$/i.test(groupId)) return badRequest('Choose a class.')
  if (parentName.length < 2) return badRequest('Please give your name.')
  if (!/^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(email)) {
    return badRequest('Please give a valid email address.')
  }
  if (!hasAdminCredentials()) return badRequest('Temporarily unavailable', 503)

  try {
    const db = createAdminClient()

    const { data: group } = await db
      .from('groups')
      .select('id, name')
      .eq('id', groupId)
      .maybeSingle()
    if (!group) return badRequest('That class no longer exists.')
    const groupName = (group as { name: string }).name

    const { error } = await db.from('waitlist_entries').upsert(
      {
        group_id: groupId,
        parent_name: parentName,
        email,
        phone,
        child_name: childName,
        notes,
        status: 'waiting',
      },
      { onConflict: 'group_id,email' }
    )
    if (error) {
      if (/does not exist|schema cache/i.test(error.message)) {
        return badRequest('The waiting list is not switched on yet.', 503)
      }
      throw error
    }

    const { count } = await db
      .from('waitlist_entries')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('status', 'waiting')

    return NextResponse.json({
      ok: true,
      groupName,
      position: count ?? null,
      message: `You are on the waiting list for ${groupName}.`,
    })
  } catch (err) {
    return serverError('api/waitlist', err)
  }
}
