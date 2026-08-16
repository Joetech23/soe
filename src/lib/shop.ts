import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database, ProductRow } from '@/lib/supabase/types'

/**
 * Public catalogue reads.
 *
 * Uses the ANON key deliberately — the catalogue is public data and RLS already
 * restricts it to `active = true`. Reading it with the service role would
 * silently bypass that policy, so a mistakenly-deactivated product would still
 * appear on the site. Anon here is the safer default.
 *
 * `product_assets` (private storage paths) is never touched by these functions.
 */
function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}

export type Category = { id: string; slug: string; name: string; summary: string | null }

export async function getCategories(): Promise<Category[]> {
  const db = publicClient()
  if (!db) return []
  const { data, error } = await db
    .from('product_categories')
    .select('id, slug, name, summary')
    .eq('active', true)
    .order('sort_order')
  if (error) {
    console.error('[shop] getCategories', error.message)
    return []
  }
  return (data ?? []) as Category[]
}

export async function getProducts(): Promise<ProductRow[]> {
  const db = publicClient()
  if (!db) return []
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('active', true)
    .order('sort_order')
  if (error) {
    console.error('[shop] getProducts', error.message)
    return []
  }
  return (data ?? []) as ProductRow[]
}

export async function getProductBySlug(slug: string): Promise<ProductRow | null> {
  const db = publicClient()
  if (!db) return null
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()
  if (error) {
    console.error('[shop] getProductBySlug', error.message)
    return null
  }
  return (data as ProductRow) ?? null
}

export async function getFreeProducts(limit = 3): Promise<ProductRow[]> {
  return (await getProducts()).filter((p) => p.is_free).slice(0, limit)
}

/**
 * Icon + tile styling for a product. The database stores commerce facts, not
 * presentation, so the visual mapping lives here keyed by category.
 */
const CATEGORY_STYLE: Record<string, { icon: string; tile: string }> = {
  Phonics: { icon: 'Sparkles', tile: 'bg-tile-amber text-gold-deep' },
  Reading: { icon: 'BookOpen', tile: 'bg-tile-sky text-teal' },
  KS2: { icon: 'BookMarked', tile: 'bg-tile-rose text-coral' },
  Parents: { icon: 'GraduationCap', tile: 'bg-tile-violet text-ink-soft' },
}

const SLUG_ICON: Record<string, string> = {
  'ks2-inference-cards': 'BookOpen',
  'recommended-books': 'BookMarked',
  'parents-evening-guide': 'Calendar',
  'expressive-reading-guide': 'Mic',
  'rhyming-bingo': 'Sparkles',
  'school-readiness-guide': 'GraduationCap',
  'phonics-handbook': 'Feather',
  'phonics-webinar': 'Headphones',
}

export function styleFor(product: { slug: string }, categoryName?: string) {
  const base = CATEGORY_STYLE[categoryName ?? ''] ?? {
    icon: 'BookOpen',
    tile: 'bg-teal-tint text-teal',
  }
  return { icon: SLUG_ICON[product.slug] ?? base.icon, tile: base.tile }
}
