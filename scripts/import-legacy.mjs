#!/usr/bin/env node
/**
 * Import ./legacy-export into the NEW (self-owned) Supabase project.
 *
 *   node scripts/import-legacy.mjs           # dry run — shows what it would do
 *   node scripts/import-legacy.mjs --commit  # actually writes
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local,
 * so it always targets the project the app itself is pointed at.
 *
 * Auth users: password hashes cannot be exported, so parents are recreated
 * WITHOUT passwords. Each gets a password-reset/magic link instead. Original
 * user ids are preserved where possible so children.parent_user_id still points
 * at the right person; where Supabase refuses an id, the mapping is rewritten.
 *
 * Idempotent: every insert is an upsert on the primary key, so a partial run
 * can safely be repeated.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const COMMIT = process.argv.includes('--commit')
const DIR = 'legacy-export'

function loadEnv() {
  const out = {}
  for (const f of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(f, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (m) out[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
      }
    } catch {}
  }
  return { ...out, ...process.env }
}

const env = loadEnv()
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!URL_ || !KEY || /placeholder/i.test(KEY)) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.')
  process.exit(1)
}
if (!existsSync(DIR)) {
  console.error(`No ./${DIR} directory — run export-legacy.mjs first.`)
  process.exit(1)
}

const db = createClient(URL_, KEY, { auth: { persistSession: false } })
const read = (n) => {
  const p = join(DIR, `${n}.json`)
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : []
}

console.log(`\n${COMMIT ? '\x1b[31mCOMMIT\x1b[0m' : '\x1b[33mDRY RUN\x1b[0m'} → ${URL_}\n`)

let failures = 0
const idMap = new Map() // old user id → new user id

// ── 1. auth users ────────────────────────────────────────────────────────────
const users = read('auth_users')
console.log(`Auth users (${users.length})`)
for (const u of users) {
  if (!u.email) continue
  if (!COMMIT) {
    console.log(`  would create ${u.email}`)
    continue
  }
  const { data, error } = await db.auth.admin.createUser({
    email: u.email,
    email_confirm: true, // they were already confirmed on the old project
    user_metadata: u.user_metadata ?? {},
  })
  if (error) {
    // Already exists? Find them and map the id.
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
    const found = list?.users.find((x) => x.email?.toLowerCase() === u.email.toLowerCase())
    if (found) {
      idMap.set(u.id, found.id)
      console.log(`  · ${u.email} already present`)
    } else {
      console.log(`  ✗ ${u.email}: ${error.message}`)
      failures++
    }
    continue
  }
  idMap.set(u.id, data.user.id)
  console.log(`  ✓ ${u.email}`)
}

const mapUser = (old) => (old ? (idMap.get(old) ?? null) : null)

// ── 2. tables, in dependency order ───────────────────────────────────────────
async function push(table, rows, transform = (r) => r) {
  console.log(`\n${table} (${rows.length})`)
  if (!rows.length) return
  const payload = rows.map(transform)
  if (!COMMIT) {
    console.log(`  would upsert ${payload.length} row(s)`)
    return
  }
  const { error } = await db.from(table).upsert(payload, { onConflict: 'id' })
  if (error) {
    console.log(`  ✗ ${error.message}`)
    failures++
  } else {
    console.log(`  ✓ ${payload.length} row(s)`)
  }
}

await push('groups', read('groups'))
await push('children', read('children'), (c) => ({
  ...c,
  parent_user_id: mapUser(c.parent_user_id),
}))
await push('invite_codes', read('invite_codes'), (i) => ({
  ...i,
  used_by: mapUser(i.used_by),
}))
await push('homework_items', read('homework_items'))
await push('feedback_notes', read('feedback_notes'))
await push(
  'user_roles',
  read('user_roles').filter((r) => mapUser(r.user_id)),
  (r) => ({ ...r, user_id: mapUser(r.user_id) })
)

// ── 3. homework files ────────────────────────────────────────────────────────
const filesDir = join(DIR, 'homework-files')
const files = existsSync(filesDir) ? readdirSync(filesDir) : []
console.log(`\nHomework files (${files.length})`)
for (const name of files) {
  if (!COMMIT) {
    console.log(`  would upload ${name}`)
    continue
  }
  const body = readFileSync(join(filesDir, name))
  const { error } = await db.storage
    .from('homework')
    .upload(name, body, { upsert: true, contentType: 'application/octet-stream' })
  if (error) {
    console.log(`  ✗ ${name}: ${error.message}`)
    failures++
  } else {
    console.log(`  ✓ ${name}`)
  }
}

// ── done ─────────────────────────────────────────────────────────────────────
console.log('')
if (!COMMIT) {
  console.log('Dry run only. Re-run with --commit to write.\n')
} else if (failures === 0) {
  console.log('\x1b[32m\x1b[1mImport complete.\x1b[0m')
  console.log(
    '\nNEXT: parents have no password on the new project. Send each a password\n' +
      'reset from Supabase → Authentication → Users, or have them use "forgot\n' +
      'password" on the portal. Their children stay linked.\n'
  )
} else {
  console.log(`\x1b[31m\x1b[1m${failures} failure(s) — review above.\x1b[0m\n`)
}
process.exit(failures === 0 ? 0 : 1)
