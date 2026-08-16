#!/usr/bin/env node
/**
 * Export everything out of the OLD (Lovable-managed) Supabase project.
 *
 *   LEGACY_SUPABASE_URL=https://xxxx.supabase.co \
 *   LEGACY_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/export-legacy.mjs
 *
 * Writes ./legacy-export/*.json plus the homework files.
 *
 * READ-ONLY. It never writes to the source project.
 *
 * ⚠ This exports CHILDREN'S PERSONAL DATA (names, year groups, lesson notes)
 *   and parent email addresses. The output directory is gitignored. Delete it
 *   once the import is verified, and don't move it onto a shared drive.
 */
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const URL_ = process.env.LEGACY_SUPABASE_URL
const KEY = process.env.LEGACY_SERVICE_ROLE_KEY
const OUT = 'legacy-export'

if (!URL_ || !KEY) {
  console.error(`
Missing credentials. Run with:

  LEGACY_SUPABASE_URL=https://<old-ref>.supabase.co \\
  LEGACY_SERVICE_ROLE_KEY=<old service_role key> \\
  node scripts/export-legacy.mjs
`)
  process.exit(1)
}

const db = createClient(URL_, KEY, { auth: { persistSession: false } })
mkdirSync(OUT, { recursive: true })
mkdirSync(join(OUT, 'homework-files'), { recursive: true })

const save = (name, data) => {
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(data, null, 2))
  console.log(`  ✓ ${name}: ${Array.isArray(data) ? data.length : 1} record(s)`)
}

console.log(`\nExporting from ${URL_}\n`)

// ── tables — order matters for the later import (parents before children) ────
const TABLES = [
  'groups',
  'children',
  'invite_codes',
  'homework_items',
  'feedback_notes',
  'user_roles',
]

let failures = 0
for (const t of TABLES) {
  const { data, error } = await db.from(t).select('*')
  if (error) {
    console.log(`  ✗ ${t}: ${error.message}`)
    failures++
    continue
  }
  save(t, data ?? [])
}

// ── auth users ───────────────────────────────────────────────────────────────
// Password hashes are NOT retrievable through the Admin API. Parents will be
// re-invited on the new project (magic link or a fresh invite code), so we only
// need identity + metadata here.
console.log('\nAuth users:')
try {
  const users = []
  let page = 1
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    users.push(
      ...data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        user_metadata: u.user_metadata,
        email_confirmed_at: u.email_confirmed_at,
      }))
    )
    if (data.users.length < 200) break
    page++
  }
  save('auth_users', users)
} catch (err) {
  console.log(`  ✗ auth users: ${err.message}`)
  failures++
}

// ── homework files from the private bucket ───────────────────────────────────
console.log('\nHomework files:')
try {
  const { data: files, error } = await db.storage.from('homework').list('', { limit: 1000 })
  if (error) throw error

  const manifest = []
  for (const f of files ?? []) {
    if (!f.name) continue
    const { data: blob, error: dlErr } = await db.storage.from('homework').download(f.name)
    if (dlErr) {
      console.log(`  ✗ ${f.name}: ${dlErr.message}`)
      failures++
      continue
    }
    const buf = Buffer.from(await blob.arrayBuffer())
    writeFileSync(join(OUT, 'homework-files', f.name), buf)
    manifest.push({ name: f.name, size: buf.length })
    console.log(`  ✓ ${f.name} (${buf.length} bytes)`)
  }
  save('homework_files_manifest', manifest)
} catch (err) {
  console.log(`  ✗ storage: ${err.message}`)
  failures++
}

console.log(
  failures === 0
    ? `\n\x1b[32m\x1b[1mExport complete → ./${OUT}\x1b[0m\n\nCheck the JSON files look right, then run import-legacy.mjs against the new project.\n`
    : `\n\x1b[31m\x1b[1mExport finished with ${failures} failure(s) — review before importing.\x1b[0m\n`
)
process.exit(failures === 0 ? 0 : 1)
