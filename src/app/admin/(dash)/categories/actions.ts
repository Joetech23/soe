'use server'

import { revalidatePath } from 'next/cache'
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

export type ActionResult = { ok: boolean; message: string }

const catSchema = z.object({
  name: z.string().trim().min(2, 'Give the category a name.').max(60),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Web address can only use lowercase letters, numbers and hyphens.'),
  summary: z.string().trim().max(200).optional().or(z.literal('')),
})

export async function createCategory(formData: FormData): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const rawName = String(formData.get('name') ?? '')
    const slugified = rawName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

    const parsed = catSchema.safeParse({
      name: rawName,
      slug: String(formData.get('slug') || slugified),
      summary: String(formData.get('summary') ?? ''),
    })
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }
    const d = parsed.data

    const { count } = await db
      .from('product_categories')
      .select('id', { count: 'exact', head: true })

    const { error } = await db.from('product_categories').insert({
      name: d.name,
      slug: d.slug,
      summary: d.summary || null,
      sort_order: (count ?? 0) + 1,
    })
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        return { ok: false, message: 'A category with that web address already exists.' }
      }
      throw error
    }

    revalidatePath('/admin/categories')
    revalidatePath('/resources')
    return { ok: true, message: `"${d.name}" created.` }
  } catch (err) {
    console.error('[admin/createCategory]', err)
    return { ok: false, message: 'Could not create that category.' }
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    // Products reference categories — refuse rather than orphan them.
    const { count } = await db
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)

    if ((count ?? 0) > 0) {
      return {
        ok: false,
        message: `Move those ${count} resource(s) to another category first.`,
      }
    }
    const { error } = await db.from('product_categories').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/admin/categories')
    revalidatePath('/resources')
    return { ok: true, message: 'Category removed.' }
  } catch (err) {
    console.error('[admin/deleteCategory]', err)
    return { ok: false, message: 'Could not remove that category.' }
  }
}
