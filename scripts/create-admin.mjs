#!/usr/bin/env node
/**
 * Create (or promote) an admin user on the current project.
 *
 *   node scripts/create-admin.mjs <email> [password]
 *
 * If no password is given, a strong one is generated and printed ONCE.
 * The account is created email-confirmed, and granted the 'admin' role.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

const env = {}
for (const f of ['.env.local', '.env']) {
  try {
    for (const l of readFileSync(f, 'utf8').split('\n')) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
    }
  } catch {}
}

const email = process.argv[2]
if (!email) { console.error('Usage: node scripts/create-admin.mjs <email> [password]'); process.exit(1) }
const password = process.argv[3] ?? randomBytes(12).toString('base64url')
const generated = !process.argv[3]

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

let userId
const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true })
if (error) {
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
  const found = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!found) { console.error('Could not create or find user:', error.message); process.exit(1) }
  userId = found.id
  console.log(`User already existed — promoting ${email}`)
} else {
  userId = data.user.id
  console.log(`Created ${email}`)
}

const { error: roleErr } = await db.from('user_roles').upsert(
  { user_id: userId, role: 'admin' },
  { onConflict: 'user_id,role' }
)
if (roleErr) { console.error('Role grant failed:', roleErr.message); process.exit(1) }

console.log('Granted admin role.')
if (generated) {
  console.log('\n  Sign in at /admin/login')
  console.log(`  Email:    ${email}`)
  console.log(`  Password: ${password}`)
  console.log('\n  ^ Shown once. Change it after first sign-in.\n')
}
