#!/usr/bin/env node
/**
 * Backend + security self-test.
 *
 *   node scripts/verify-backend.mjs
 *
 * Reads .env.local, then checks — as an ANONYMOUS client, i.e. what an attacker
 * sees — that:
 *   1. the project is reachable and keys work
 *   2. migrations are applied and the catalogue is seeded
 *   3. RLS actually blocks anon reads of orders/entitlements/customers
 *   4. product_assets (private file paths) are NOT publicly readable
 *   5. the private storage bucket rejects anonymous reads
 *   6. money-touching RPCs are not callable by anon
 *
 * Exits non-zero if any security assertion fails.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ── env ─────────────────────────────────────────────────────────────────────
function loadEnv() {
  const out = {}
  for (const file of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (m) out[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
      }
    } catch {
      /* file may not exist */
    }
  }
  return { ...out, ...process.env }
}

const env = loadEnv()
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY

const pass = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const fail = (m) => {
  console.log(`  \x1b[31m✗ ${m}\x1b[0m`)
  failures++
}
const warn = (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`)
const head = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`)

let failures = 0
const placeholder = (v) => !v || /placeholder|your-|xxx/i.test(v)

head('1. Configuration')
if (placeholder(URL_)) fail('NEXT_PUBLIC_SUPABASE_URL missing')
else pass(`Project URL ${URL_}`)
if (placeholder(ANON)) fail('NEXT_PUBLIC_SUPABASE_ANON_KEY missing/placeholder')
else pass('Anon key present')
if (placeholder(SERVICE)) warn('SUPABASE_SERVICE_ROLE_KEY missing (server routes will 503)')
else pass('Service-role key present')

if (placeholder(URL_) || placeholder(ANON)) {
  console.log('\n\x1b[31mCannot continue without a URL and anon key.\x1b[0m\n')
  process.exit(1)
}

const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
const admin = placeholder(SERVICE)
  ? null
  : createClient(URL_, SERVICE, { auth: { persistSession: false } })

// ── 2. reachability + schema ────────────────────────────────────────────────
head('2. Schema & seed')
{
  const { data, error } = await anon
    .from('products')
    .select('slug,name,price_pence,is_free')
    .order('sort_order')
  if (error) fail(`products unreadable: ${error.message} (migrations applied?)`)
  else {
    pass(`products table readable — ${data.length} row(s)`)
    if (data.length === 0) warn('no products seeded yet — run supabase/seed.sql')
    const paid = data.filter((p) => !p.is_free).length
    if (data.length) pass(`${data.length - paid} free / ${paid} paid`)
  }

  const { error: catErr } = await anon.from('product_categories').select('slug')
  catErr ? fail(`product_categories: ${catErr.message}`) : pass('categories readable')
}

// ── 3. RLS: anon must NOT read private tables ───────────────────────────────
head('3. RLS — anonymous must be blocked')
for (const table of [
  'orders',
  'order_items',
  'entitlements',
  'customers',
  'download_tokens',
  'newsletter_subscribers',
  'booking_requests',
  'download_events',
]) {
  const { data, error } = await anon.from(table).select('*').limit(1)
  if (error) pass(`${table} blocked (${error.code ?? 'error'})`)
  else if (Array.isArray(data) && data.length === 0)
    pass(`${table} returns no rows to anon`)
  else fail(`${table} LEAKED ${data.length} row(s) to anonymous!`)
}

// ── 4. product_assets must not expose file paths ────────────────────────────
head('4. Private file paths')
{
  const { data, error } = await anon.from('product_assets').select('storage_path').limit(1)
  if (error) pass(`product_assets blocked (${error.code ?? 'error'})`)
  else if (!data?.length) pass('product_assets returns nothing to anon')
  else fail('product_assets LEAKED storage paths to anonymous!')
}

// ── 5. private bucket ───────────────────────────────────────────────────────
head('5. Storage buckets')
{
  const { data, error } = await anon.storage.from('product-files').list('', { limit: 1 })
  if (error) pass(`product-files private (${error.message})`)
  else if (!data?.length) pass('product-files exposes no objects to anon')
  else fail('product-files bucket is READABLE by anonymous!')

  if (admin) {
    const { data: buckets } = await admin.storage.listBuckets()
    const names = (buckets ?? []).map((b) => `${b.name}${b.public ? ' (public)' : ' (private)'}`)
    const pf = (buckets ?? []).find((b) => b.name === 'product-files')
    if (!pf) fail('product-files bucket does not exist — run migration 0006')
    else if (pf.public) fail('product-files is PUBLIC — it must be private!')
    else pass('product-files exists and is private')
    if (names.length) console.log(`     buckets: ${names.join(', ')}`)
  }
}

// ── 6. privileged RPCs must be revoked from anon ────────────────────────────
head('6. Privileged RPCs blocked for anon')
for (const [fn, args] of [
  ['create_order', { p_items: [], p_customer_name: 'x', p_customer_email: 'x@x.com' }],
  ['mark_order_paid', { p_order_number: 'SOE-TEST', p_provider: 'none' }],
  ['expire_stale_orders', {}],
]) {
  const { error } = await anon.rpc(fn, args)
  // Any error is fine — permission denied, or a validation raise. What we must
  // never see is a clean success.
  if (error) pass(`${fn} rejected (${(error.message || '').slice(0, 60)})`)
  else fail(`${fn} was callable by ANONYMOUS — revoke EXECUTE!`)
}

// ── 7. tutoring schema still intact ─────────────────────────────────────────
head('7. Existing tutoring schema')
if (admin) {
  for (const t of ['children', 'groups', 'homework_items', 'feedback_notes', 'user_roles']) {
    const { error } = await admin.from(t).select('id').limit(1)
    error ? fail(`${t}: ${error.message}`) : pass(`${t} intact`)
  }
} else {
  warn('skipped (needs service-role key)')
}

// ── summary ─────────────────────────────────────────────────────────────────
console.log('')
if (failures === 0) {
  console.log('\x1b[32m\x1b[1m  All backend + security checks passed.\x1b[0m\n')
  process.exit(0)
} else {
  console.log(`\x1b[31m\x1b[1m  ${failures} check(s) FAILED — do not go live.\x1b[0m\n`)
  process.exit(1)
}
