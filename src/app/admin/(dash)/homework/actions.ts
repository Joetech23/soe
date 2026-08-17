'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { hasRole } from '@/lib/supabase/rpc'
import { sendEmail, redact } from '@/lib/email/send'
import { homeworkPostedEmail, feedbackPostedEmail } from '@/lib/email/templates'
import { getSettings } from '@/lib/settings'
import { siteUrl } from '@/lib/utils'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type Admin = SupabaseClient<Database>

/**
 * Finds the parents to notify for a homework/feedback post, and their child's
 * name. A group post notifies every linked parent in that group; a single-child
 * post notifies just that child's parent.
 *
 * Children without a linked parent are silently skipped — Ms Betty may add a
 * child before the parent has redeemed their invite code.
 */
async function recipientsFor(
  db: Admin,
  opts: { childId?: string | null; groupId?: string | null }
): Promise<{ email: string; childName: string }[]> {
  const q = db.from('children').select('id, name, parent_user_id')
  const { data } = opts.childId
    ? await q.eq('id', opts.childId)
    : await q.eq('group_id', opts.groupId ?? '')

  const kids = ((data ?? []) as {
    id: string
    name: string
    parent_user_id: string | null
  }[]).filter((c) => c.parent_user_id)

  const out: { email: string; childName: string }[] = []
  for (const c of kids) {
    try {
      const { data: u } = await db.auth.admin.getUserById(c.parent_user_id!)
      if (u?.user?.email) out.push({ email: u.user.email, childName: c.name })
    } catch {
      /* a missing auth user must not stop the post */
    }
  }
  return out
}

/**
 * Parent-portal homework management.
 *
 * Files go into the PRIVATE `homework` bucket. Parents never get a direct URL —
 * /api/homework-file checks that the child belongs to them, then mints a
 * short-lived signed link.
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

export type ActionResult = { ok: boolean; message: string }

const homeworkSchema = z
  .object({
    title: z.string().trim().min(2, 'Give the homework a title.').max(160),
    description: z.string().trim().max(2000).optional().or(z.literal('')),
    dueDate: z.string().trim().optional().or(z.literal('')),
    groupId: z.string().uuid().optional().or(z.literal('')),
    childId: z.string().uuid().optional().or(z.literal('')),
  })
  .refine((d) => d.groupId || d.childId, {
    message: 'Choose a group or a single child.',
  })

export async function createHomework(formData: FormData): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const parsed = homeworkSchema.safeParse({
      title: String(formData.get('title') ?? ''),
      description: String(formData.get('description') ?? ''),
      dueDate: String(formData.get('dueDate') ?? ''),
      groupId: String(formData.get('groupId') ?? ''),
      childId: String(formData.get('childId') ?? ''),
    })
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }
    const d = parsed.data

    // Optional attachment
    let filePath: string | null = null
    const file = formData.get('file')
    if (file instanceof File && file.size > 0) {
      if (file.size > 50 * 1024 * 1024) {
        return { ok: false, message: 'That file is over 50MB — please compress it.' }
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
      filePath = `${crypto.randomUUID()}-${safe}`
      const { error: upErr } = await db.storage
        .from('homework')
        .upload(filePath, file, {
          contentType: file.type || 'application/octet-stream',
        })
      if (upErr) throw upErr
    }

    const { error } = await db.from('homework_items').insert({
      title: d.title,
      description: d.description || null,
      due_date: d.dueDate || null,
      group_id: d.groupId || null,
      child_id: d.childId || null,
      file_path: filePath,
    })
    if (error) throw error

    // Notify parents. Email failure must never undo a successful post, so this
    // is fully isolated and only affects the message shown back to Ms Betty.
    let notified = 0
    let notifyOff = false
    try {
      notifyOff = !(await getSettings()).notifyHomework
      const people = notifyOff
        ? []
        : await recipientsFor(db, {
            childId: d.childId || null,
            groupId: d.groupId || null,
          })
      const results = await Promise.allSettled(
        people.map((p) => {
          const mail = homeworkPostedEmail({
            childName: p.childName,
            title: d.title,
            description: d.description || null,
            dueDate: d.dueDate || null,
            hasAttachment: Boolean(filePath),
            portalUrl: siteUrl('/account/child'),
          })
          return sendEmail({
            to: p.email,
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
            tag: 'homework-posted',
          })
        })
      )
      notified = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 'sent'
      ).length
      console.info(
        `[homework] notified ${notified}/${people.length}: ${people.map((p) => redact(p.email)).join(', ')}`
      )
    } catch (err) {
      console.warn('[homework] notification step failed', err)
    }

    revalidatePath('/admin/homework')
    revalidatePath('/account/child')
    return {
      ok: true,
      message:
        notified > 0
          ? `Homework posted — ${notified} parent${notified === 1 ? '' : 's'} emailed.`
          : notifyOff
            ? 'Homework posted. (Parent emails are switched off in Settings.)'
            : 'Homework posted. (No linked parents to email yet.)',
    }
  } catch (err) {
    console.error('[admin/createHomework]', err)
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Could not post homework.',
    }
  }
}

export async function deleteHomework(id: string): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const { data } = await db
      .from('homework_items')
      .select('file_path')
      .eq('id', id)
      .maybeSingle()

    const path = (data as { file_path: string | null } | null)?.file_path
    if (path) await db.storage.from('homework').remove([path])
    await db.from('homework_items').delete().eq('id', id)

    revalidatePath('/admin/homework')
    revalidatePath('/account/child')
    return { ok: true, message: 'Homework removed.' }
  } catch (err) {
    console.error('[admin/deleteHomework]', err)
    return { ok: false, message: 'Could not remove that homework.' }
  }
}

/* -------------------------------------------------------------------------- */
/*  Lesson feedback                                                            */
/* -------------------------------------------------------------------------- */
const feedbackSchema = z.object({
  childId: z.string().uuid('Choose a child.'),
  note: z.string().trim().min(3, 'Write a short note.').max(4000),
  lessonDate: z.string().trim().optional().or(z.literal('')),
})

export async function createFeedback(formData: FormData): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const parsed = feedbackSchema.safeParse({
      childId: String(formData.get('childId') ?? ''),
      note: String(formData.get('note') ?? ''),
      lessonDate: String(formData.get('lessonDate') ?? ''),
    })
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }
    const d = parsed.data

    const { error } = await db.from('feedback_notes').insert({
      child_id: d.childId,
      note: d.note,
      lesson_date: d.lessonDate || null,
    })
    if (error) throw error

    let notified = 0
    let notifyOff = false
    try {
      notifyOff = !(await getSettings()).notifyFeedback
      const people = notifyOff ? [] : await recipientsFor(db, { childId: d.childId })
      const results = await Promise.allSettled(
        people.map((p) => {
          const mail = feedbackPostedEmail({
            childName: p.childName,
            note: d.note,
            lessonDate: d.lessonDate || null,
            portalUrl: siteUrl('/account/child'),
          })
          return sendEmail({
            to: p.email,
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
            tag: 'feedback-posted',
          })
        })
      )
      notified = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 'sent'
      ).length
    } catch (err) {
      console.warn('[feedback] notification step failed', err)
    }

    revalidatePath('/admin/feedback')
    revalidatePath('/account/child')
    return {
      ok: true,
      message:
        notified > 0
          ? 'Feedback saved and emailed to the parent.'
          : notifyOff
            ? 'Feedback saved. (Parent emails are switched off in Settings.)'
            : 'Feedback saved. (No linked parent to email yet.)',
    }
  } catch (err) {
    console.error('[admin/createFeedback]', err)
    return { ok: false, message: 'Could not save that feedback.' }
  }
}
