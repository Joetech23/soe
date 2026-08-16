'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { hasRole } from '@/lib/supabase/rpc'

/**
 * Admin product mutations.
 *
 * Every action re-verifies the admin role from the session before touching the
 * service-role client. Server actions are a public HTTP surface — being inside
 * the admin layout is not authorisation.
 */
async function requireAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')
  const ok = await hasRole(supabase, user.id, 'admin')
  if (!ok) throw new Error('Not authorised.')
  if (!hasAdminCredentials()) throw new Error('Server not configured.')
  return createAdminClient()
}

export type ActionResult = { ok: boolean; message: string }

const productSchema = z.object({
  name: z.string().trim().min(2, 'Give the resource a name.').max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Web address can only use lowercase letters, numbers and hyphens.'),
  summary: z.string().trim().max(400).optional().or(z.literal('')),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  pricePence: z.coerce.number().int().min(0).max(100_000),
  productType: z.enum(['pdf', 'video', 'bundle', 'external']),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  active: z.coerce.boolean(),
})

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const rawName = String(formData.get('name') ?? '')
    const parsed = productSchema.safeParse({
      name: rawName,
      slug: String(formData.get('slug') || slugify(rawName)),
      summary: String(formData.get('summary') ?? ''),
      description: String(formData.get('description') ?? ''),
      pricePence: formData.get('pricePence') ?? 0,
      productType: String(formData.get('productType') ?? 'pdf'),
      categoryId: String(formData.get('categoryId') ?? ''),
      active: formData.get('active') === 'on',
    })
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }
    const d = parsed.data

    const { error } = await db.from('products').insert({
      name: d.name,
      slug: d.slug,
      summary: d.summary || null,
      description: d.description || null,
      price_pence: d.pricePence,
      product_type: d.productType,
      category_id: d.categoryId || null,
      active: d.active,
      published_at: new Date().toISOString(),
    })
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        return { ok: false, message: 'A resource with that web address already exists.' }
      }
      throw error
    }

    revalidatePath('/admin/products')
    revalidatePath('/resources')
    return { ok: true, message: `"${d.name}" created.` }
  } catch (err) {
    console.error('[admin/createProduct]', err)
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Could not create the resource.',
    }
  }
}

export async function updateProduct(formData: FormData): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const id = String(formData.get('id') ?? '')
    if (!id) return { ok: false, message: 'Missing product id.' }

    const parsed = productSchema.safeParse({
      name: String(formData.get('name') ?? ''),
      slug: String(formData.get('slug') ?? ''),
      summary: String(formData.get('summary') ?? ''),
      description: String(formData.get('description') ?? ''),
      pricePence: formData.get('pricePence') ?? 0,
      productType: String(formData.get('productType') ?? 'pdf'),
      categoryId: String(formData.get('categoryId') ?? ''),
      active: formData.get('active') === 'on',
    })
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }
    const d = parsed.data

    const { error } = await db
      .from('products')
      .update({
        name: d.name,
        slug: d.slug,
        summary: d.summary || null,
        description: d.description || null,
        price_pence: d.pricePence,
        product_type: d.productType,
        category_id: d.categoryId || null,
        active: d.active,
      })
      .eq('id', id)
    if (error) throw error

    revalidatePath('/admin/products')
    revalidatePath('/resources')
    revalidatePath(`/resources/${d.slug}`)
    return { ok: true, message: 'Saved.' }
  } catch (err) {
    console.error('[admin/updateProduct]', err)
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Could not save changes.',
    }
  }
}

/** Soft delete — order history snapshots the name, but never orphan a purchase. */
export async function setProductActive(
  id: string,
  active: boolean
): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const { error } = await db.from('products').update({ active }).eq('id', id)
    if (error) throw error
    revalidatePath('/admin/products')
    revalidatePath('/resources')
    return { ok: true, message: active ? 'Resource is live.' : 'Resource hidden.' }
  } catch (err) {
    console.error('[admin/setProductActive]', err)
    return { ok: false, message: 'Could not update.' }
  }
}

/**
 * Uploads a file to the PRIVATE product-files bucket and records the asset.
 * The storage path never reaches the browser — downloads go through
 * /api/download, which checks entitlement and mints a 60-second signed URL.
 */
export async function uploadProductFile(formData: FormData): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const productId = String(formData.get('productId') ?? '')
    const file = formData.get('file')
    const label = String(formData.get('label') ?? '') || null

    if (!productId) return { ok: false, message: 'Missing product.' }
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: 'Choose a file to upload.' }
    }
    if (file.size > 200 * 1024 * 1024) {
      return {
        ok: false,
        message: 'That file is over 200MB — host video externally instead.',
      }
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
    const path = `${productId}/${crypto.randomUUID()}-${safeName}`

    const { error: upErr } = await db.storage
      .from('product-files')
      .upload(path, file, { contentType: file.type || 'application/octet-stream' })
    if (upErr) throw upErr

    const { error: rowErr } = await db.from('product_assets').insert({
      product_id: productId,
      kind: 'main',
      label,
      storage_bucket: 'product-files',
      storage_path: path,
      mime_type: file.type || null,
      size_bytes: file.size,
    })
    if (rowErr) throw rowErr

    revalidatePath('/admin/products')
    return { ok: true, message: `Uploaded ${safeName}.` }
  } catch (err) {
    console.error('[admin/uploadProductFile]', err)
    return { ok: false, message: err instanceof Error ? err.message : 'Upload failed.' }
  }
}

export async function deleteProductAsset(assetId: string): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const { data: asset } = await db
      .from('product_assets')
      .select('storage_bucket, storage_path')
      .eq('id', assetId)
      .maybeSingle()

    const a = asset as { storage_bucket: string; storage_path: string | null } | null
    if (a?.storage_path) {
      await db.storage.from(a.storage_bucket).remove([a.storage_path])
    }
    await db.from('product_assets').delete().eq('id', assetId)

    revalidatePath('/admin/products')
    return { ok: true, message: 'File removed.' }
  } catch (err) {
    console.error('[admin/deleteProductAsset]', err)
    return { ok: false, message: 'Could not remove that file.' }
  }
}
