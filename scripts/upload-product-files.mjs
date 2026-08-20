/**
 * Uploads Ms Betty's resource files into the private product-files bucket and
 * registers each one in product_assets.
 *
 * Why this exists: the catalogue had 8 products but zero assets, so every
 * download — free ones included — resolved to nothing and bounced to
 * /download/unavailable. Products without a file are reported, not skipped
 * silently.
 *
 * Idempotent: re-running replaces the object and updates the row rather than
 * creating duplicates.  Run: node scripts/upload-product-files.mjs [--video]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, statSync, existsSync } from 'node:fs'
import { basename, extname } from 'node:path'

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l.trim())
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
}
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const SRC = 'C:/Users/HP/Downloads/migration video'
const MIME = { '.pdf': 'application/pdf', '.mp4': 'video/mp4' }

const MAP = [
  ['recommended-books',         'Book recommendations.pdf'],
  ['parents-evening-guide',     'parents evening guide.pdf'],
  ['ks2-inference-cards',       'KS2 inference cards.pdf'],
  ['expressive-reading-guide',  'Expressive reading guide for parents.pdf'],
  ['phonics-handbook',          'Phonics fun handbook.pdf'],
  ['phonics-webinar',           'GMT20251213-101825_Recording.cutfile.20251214204246820_1790x920 1.mp4'],
]

const withVideo = process.argv.includes('--video')
const { data: products } = await db.from('products').select('id, slug, name, product_type')
const bySlug = new Map((products ?? []).map((p) => [p.slug, p]))

for (const [slug, file] of MAP) {
  const product = bySlug.get(slug)
  if (!product) { console.log(`SKIP  ${slug} — no such product`); continue }

  const isVideo = extname(file).toLowerCase() === '.mp4'
  if (isVideo && !withVideo) { console.log(`SKIP  ${slug} — video, pass --video`); continue }

  const path = `${SRC}/${file}`
  if (!existsSync(path)) { console.log(`MISS  ${slug} — ${file} not found`); continue }

  const bytes = readFileSync(path)
  const size = statSync(path).size
  // Keep the customer-facing filename tidy; the object key stays predictable.
  const key = `${slug}/${basename(file).replace(/\s+/g, '-').toLowerCase()}`
  const mime = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream'

  const up = await db.storage.from('product-files').upload(key, bytes, {
    contentType: mime,
    upsert: true,
  })
  if (up.error) { console.log(`FAIL  ${slug} — ${up.error.message}`); continue }

  const { data: existing } = await db
    .from('product_assets')
    .select('id')
    .eq('product_id', product.id)
    .eq('kind', 'main')
    .maybeSingle()

  const row = {
    product_id: product.id,
    kind: 'main',
    label: basename(file, extname(file)),
    storage_bucket: 'product-files',
    storage_path: key,
    mime_type: mime,
    size_bytes: size,
  }
  const res = existing
    ? await db.from('product_assets').update(row).eq('id', existing.id)
    : await db.from('product_assets').insert(row)

  console.log(
    res.error ? `FAIL  ${slug} — ${res.error.message}`
              : `OK    ${slug} — ${(size / 1024 / 1024).toFixed(1)} MB -> ${key}`
  )
}

const covered = new Set(MAP.map(([s]) => s))
const missing = (products ?? []).filter((p) => !covered.has(p.slug))
if (missing.length) {
  console.log(`\nNo file supplied for: ${missing.map((p) => p.slug).join(', ')}`)
  console.log('These will still fail to download until a file is provided.')
}
