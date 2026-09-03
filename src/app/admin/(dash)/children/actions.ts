'use server'

import { revalidatePath } from 'next/cache'
import { randomInt } from 'node:crypto'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { hasRole } from '@/lib/supabase/rpc'

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

export type ActionResult = { ok: boolean; message: string; code?: string }

/**
 * Invite code: NAME-XXXX using an alphabet with no look-alike characters
 * (no O/0, I/1, L). Parents type these by hand off a message, so ambiguity
 * costs Ms Betty a support conversation.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function inviteCode(name: string) {
  const stem =
    name
      .trim()
      .split(/\s+/)[0]
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 6) || 'CHILD'
  let tail = ''
  for (let i = 0; i < 4; i++) tail += ALPHABET[randomInt(ALPHABET.length)]
  return `${stem}-${tail}`
}

/* ---------------------------------- groups --------------------------------- */
const groupSchema = z.object({
  name: z.string().trim().min(2, 'Give the group a name.').max(80),
  description: z.string().trim().max(300).optional().or(z.literal('')),
  isOneToOne: z.coerce.boolean(),
  // '' means "no limit"; a number caps the class.
  capacity: z
    .union([z.coerce.number().int().min(1).max(100), z.literal('')])
    .optional(),
})

export async function createGroup(formData: FormData): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const parsed = groupSchema.safeParse({
      name: String(formData.get('name') ?? ''),
      description: String(formData.get('description') ?? ''),
      isOneToOne: formData.get('isOneToOne') === 'on',
      capacity: String(formData.get('capacity') ?? '') || '',
    })
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }
    const d = parsed.data
    const { error } = await db.from('groups').insert({
      name: d.name,
      description: d.description || null,
      is_one_to_one: d.isOneToOne,
      // Blank means no limit, which is not the same as a limit of zero.
      capacity: typeof d.capacity === 'number' ? d.capacity : null,
    })
    if (error) throw error

    revalidatePath('/admin/groups')
    revalidatePath('/admin/children')
    return { ok: true, message: `"${d.name}" created.` }
  } catch (err) {
    console.error('[admin/createGroup]', err)
    return { ok: false, message: 'Could not create that group.' }
  }
}

export async function deleteGroup(id: string): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    // Children reference the group with ON DELETE SET NULL, so nobody is lost —
    // they simply become unassigned.
    const { error } = await db.from('groups').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/admin/groups')
    revalidatePath('/admin/children')
    return { ok: true, message: 'Group removed. Any children in it are now unassigned.' }
  } catch (err) {
    console.error('[admin/deleteGroup]', err)
    return { ok: false, message: 'Could not remove that group.' }
  }
}

/* --------------------------------- children -------------------------------- */
const childSchema = z.object({
  name: z.string().trim().min(1, "Enter the child's first name.").max(80),
  groupId: z.string().uuid().optional().or(z.literal('')),
  // A sibling of a child already here: pick the parent and skip codes entirely.
  parentUserId: z.string().uuid().optional().or(z.literal('')),
})

export async function createChild(formData: FormData): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const parsed = childSchema.safeParse({
      name: String(formData.get('name') ?? ''),
      groupId: String(formData.get('groupId') ?? ''),
      parentUserId: String(formData.get('parentUserId') ?? ''),
    })
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }
    const d = parsed.data

    const { data: child, error } = await db
      .from('children')
      .insert({
        name: d.name,
        group_id: d.groupId || null,
        parent_user_id: d.parentUserId || null,
      })
      .select('id, name')
      .maybeSingle()
    if (error || !child) throw error ?? new Error('child not created')

    revalidatePath('/admin/children')

    // A child attached to an existing parent is already reachable — they will
    // simply appear in that parent's portal. A code would be noise.
    if (d.parentUserId) {
      revalidatePath('/account/child')
      return { ok: true, message: `${d.name} added and linked to their parent.` }
    }

    // Otherwise issue a code straight away: it is the only way a new parent can
    // link themselves, so a child without one is a dead end.
    const code = await mintCode(db, [(child as { id: string }).id], d.name)
    revalidatePath('/admin/children')
    return { ok: true, message: `${d.name} added.`, code }
  } catch (err) {
    console.error('[admin/createChild]', err)
    return { ok: false, message: 'Could not add that child.' }
  }
}

/**
 * Mint a code covering one or more children.
 *
 * Every code now goes through here, single child or whole family, so there is
 * one path to reason about. The children are recorded in the join table; the
 * legacy `child_id` anchor is left null and only read for codes minted before
 * migration 0010.
 */
async function mintCode(
  db: Awaited<ReturnType<typeof requireAdmin>>,
  childIds: string[],
  stemName: string
): Promise<string> {
  const code = inviteCode(stemName)
  const { data: row, error } = await db
    .from('invite_codes')
    .insert({ code })
    .select('id')
    .maybeSingle()
  if (error || !row) throw error ?? new Error('code not created')

  const { error: linkErr } = await db.from('invite_code_children').insert(
    childIds.map((child_id) => ({ code_id: (row as { id: string }).id, child_id }))
  )
  if (linkErr) throw linkErr
  return code
}

export async function issueInviteCode(
  childId: string,
  childName: string
): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const code = await mintCode(db, [childId], childName)
    revalidatePath('/admin/children')
    return { ok: true, message: `New code for ${childName}`, code }
  } catch (err) {
    console.error('[admin/issueInviteCode]', err)
    return { ok: false, message: 'Could not create a code.' }
  }
}

/**
 * One code for a parent with more than one child here.
 *
 * This is the whole point of the family model: the parent types a code once
 * and every sibling on it lands in their portal together.
 */
export async function issueFamilyCode(childIds: string[]): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const ids = [...new Set(childIds.filter(Boolean))]
    if (ids.length < 2) {
      return { ok: false, message: 'Pick at least two children for a family code.' }
    }

    const { data, error } = await db.from('children').select('id, name').in('id', ids)
    if (error) throw error
    const kids = (data ?? []) as { id: string; name: string }[]
    if (kids.length !== ids.length) {
      return { ok: false, message: 'One of those children no longer exists.' }
    }

    // Name the code after the first child so the parent recognises it.
    const sorted = [...kids].sort((a, b) => a.name.localeCompare(b.name))
    const code = await mintCode(db, ids, sorted[0].name)

    revalidatePath('/admin/children')
    return {
      ok: true,
      message: `One code for ${listNames(sorted.map((k) => k.name))}`,
      code,
    }
  } catch (err) {
    console.error('[admin/issueFamilyCode]', err)
    return { ok: false, message: 'Could not create a family code.' }
  }
}

/**
 * Attach a child to a parent who already has an account.
 *
 * A sibling who starts lessons later does not need the code dance at all —
 * their parent is already here. Passing null unlinks, which is how a
 * mis-redeemed code gets undone.
 */
export async function linkChildToParent(
  childId: string,
  parentUserId: string | null
): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const { error } = await db
      .from('children')
      .update({ parent_user_id: parentUserId })
      .eq('id', childId)
    if (error) throw error

    revalidatePath('/admin/children')
    revalidatePath('/account/child')
    return {
      ok: true,
      message: parentUserId ? 'Linked to that parent.' : 'Unlinked from their parent.',
    }
  } catch (err) {
    console.error('[admin/linkChildToParent]', err)
    return { ok: false, message: 'Could not change that link.' }
  }
}

/** "Leo", "Leo and Amara", "Leo, Amara and Sam". */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export async function assignChildGroup(
  childId: string,
  groupId: string | null
): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const { error } = await db
      .from('children')
      .update({ group_id: groupId })
      .eq('id', childId)
    if (error) throw error
    revalidatePath('/admin/children')
    revalidatePath('/account/child')
    return { ok: true, message: 'Group updated.' }
  } catch (err) {
    console.error('[admin/assignChildGroup]', err)
    return { ok: false, message: 'Could not change that group.' }
  }
}

export async function deleteChild(id: string): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    // Homework, feedback and invite codes all cascade from the child row.
    const { error } = await db.from('children').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/admin/children')
    return {
      ok: true,
      message: 'Child removed, along with their homework and feedback.',
    }
  } catch (err) {
    console.error('[admin/deleteChild]', err)
    return { ok: false, message: 'Could not remove that child.' }
  }
}
