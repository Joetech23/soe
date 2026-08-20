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
})

export async function createChild(formData: FormData): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const parsed = childSchema.safeParse({
      name: String(formData.get('name') ?? ''),
      groupId: String(formData.get('groupId') ?? ''),
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
      })
      .select('id, name')
      .maybeSingle()
    if (error || !child) throw error ?? new Error('child not created')

    // Issue the first invite code straight away — it is the only way a parent
    // can link themselves, so a child without one is a dead end.
    const code = inviteCode(d.name)
    const { error: codeErr } = await db
      .from('invite_codes')
      .insert({ code, child_id: (child as { id: string }).id })
    if (codeErr) throw codeErr

    revalidatePath('/admin/children')
    return { ok: true, message: `${d.name} added.`, code }
  } catch (err) {
    console.error('[admin/createChild]', err)
    return { ok: false, message: 'Could not add that child.' }
  }
}

export async function issueInviteCode(
  childId: string,
  childName: string
): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const code = inviteCode(childName)
    const { error } = await db.from('invite_codes').insert({ code, child_id: childId })
    if (error) throw error
    revalidatePath('/admin/children')
    return { ok: true, message: `New code for ${childName}`, code }
  } catch (err) {
    console.error('[admin/issueInviteCode]', err)
    return { ok: false, message: 'Could not create a code.' }
  }
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
