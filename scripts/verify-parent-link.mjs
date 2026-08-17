/**
 * End-to-end check of the parent-link + homework-notification loop.
 *
 * Creates a throwaway parent, redeems a real invite code as that user (so
 * auth.uid() is a genuine parent, not the service role), asserts the child is
 * linked, then asserts the admin homework action can resolve that parent's
 * email — which is what the new notification depends on.
 *
 * Cleans up after itself. Run: node scripts/verify-parent-link.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim())
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !ANON || !SVC) throw new Error('Missing Supabase env')

const admin = createClient(URL, SVC, { auth: { persistSession: false } })
const pass = []
const fail = []
const ok = (c, m) => (c ? pass : fail).push(m)

const email = `verify-${randomBytes(4).toString('hex')}@example.test`
const password = randomBytes(18).toString('base64url')
let userId = null
let childId = null

try {
  // A child with an unused invite code
  const { data: codes } = await admin
    .from('invite_codes')
    .select('code, child_id, used_at, children(name, parent_user_id)')
    .is('used_at', null)
    .limit(1)

  if (!codes?.length) {
    console.log('No unused invite code found — add a child in /admin/children first.')
    process.exit(1)
  }
  const invite = codes[0]
  childId = invite.child_id
  console.log(`Using code ${invite.code} for ${invite.children?.name}`)
  ok(!invite.children?.parent_user_id, 'child starts with no parent linked')

  // Throwaway parent
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (cErr) throw cErr
  userId = created.user.id

  // Redeem AS THAT USER, so auth.uid() is the parent
  const asParent = createClient(URL, ANON, { auth: { persistSession: false } })
  const { error: sErr } = await asParent.auth.signInWithPassword({ email, password })
  if (sErr) throw sErr

  const { data: redeemed, error: rErr } = await asParent.rpc('redeem_invite_code', {
    _code: invite.code,
  })
  ok(!rErr, `redeem_invite_code succeeded${rErr ? ` — ${rErr.message}` : ''}`)
  ok(redeemed === childId, 'redeem returned the right child id')

  // The link landed
  const { data: child } = await admin
    .from('children')
    .select('parent_user_id')
    .eq('id', childId)
    .single()
  ok(child?.parent_user_id === userId, 'children.parent_user_id now points at the parent')

  // Code is spent — a second redemption must fail
  const { error: reuse } = await asParent.rpc('redeem_invite_code', {
    _code: invite.code,
  })
  ok(!!reuse, 'a used code cannot be redeemed twice')

  // The parent can read their own child, and only their own
  const { data: mine } = await asParent.from('children').select('id')
  ok(mine?.length === 1 && mine[0].id === childId, 'parent reads exactly their own child')

  // What the homework notifier does: resolve the parent's email
  const { data: got } = await admin.auth.admin.getUserById(userId)
  ok(got?.user?.email === email, 'homework notifier can resolve the parent email')

  // A parent must NOT be able to grant themselves admin
  const { error: esc } = await asParent
    .from('user_roles')
    .insert({ user_id: userId, role: 'admin' })
  ok(!!esc, 'parent cannot self-grant the admin role')
} finally {
  if (userId) {
    await admin.from('children').update({ parent_user_id: null }).eq('id', childId)
    await admin.auth.admin.deleteUser(userId)
    console.log('cleaned up test parent')
  }
}

console.log('')
for (const p of pass) console.log(`  PASS  ${p}`)
for (const f of fail) console.log(`  FAIL  ${f}`)
console.log(`\n${pass.length} passed, ${fail.length} failed`)
process.exit(fail.length ? 1 : 0)
