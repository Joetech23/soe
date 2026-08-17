/**
 * Asserts the "verify once, then never again" guarantee end to end.
 *
 * Runs the whole journey a new parent takes — register, get a code, verify,
 * redeem an invite, then sign in again — against the live project, and checks
 * the security properties that matter at each step. Cleans up after itself.
 *
 *   node scripts/verify-auth-flow.mjs
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

const db = createClient(URL, SVC, { auth: { persistSession: false } })
const fresh = () => createClient(URL, ANON, { auth: { persistSession: false } })

const pass = []
const fail = []
const ok = (c, m) => (c ? pass : fail).push(m)

const email = `authcheck-${randomBytes(4).toString('hex')}@example.test`
const password = 'Test!' + randomBytes(10).toString('hex')
let userId = null
let childId = null
let victimId = null

try {
  /* ---------- a child to link ---------- */
  const { data: child } = await db
    .from('children')
    .insert({ name: 'Authcheck', year_group: 'Year 2' })
    .select()
    .single()
  childId = child.id
  const code = 'AUTH-' + randomBytes(2).toString('hex').toUpperCase()
  await db.from('invite_codes').insert({ code, child_id: childId })

  /* ---------- 1. registration mints an unconfirmed user + a code ---------- */
  const { data: signup, error: sErr } = await db.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: { data: { pending_invite: code } },
  })
  if (sErr) throw sErr
  userId = signup.user.id

  ok(!signup.user.email_confirmed_at, 'new account starts unconfirmed')
  ok(/^\d{6,8}$/.test(signup.properties.email_otp ?? ''), 'a numeric code is issued')
  ok(
    signup.user.user_metadata?.pending_invite === code,
    'invite code is stashed for after verification'
  )

  /* ---------- 2. before verifying, password sign-in is refused ---------- */
  {
    const { error } = await fresh().auth.signInWithPassword({ email, password })
    ok(/not confirmed/i.test(error?.message ?? ''), 'unverified account cannot sign in')
  }

  /* ---------- 3. a wrong code is rejected ---------- */
  {
    const { error } = await fresh().auth.verifyOtp({
      email,
      token: '00000000',
      type: 'signup',
    })
    ok(Boolean(error), 'a wrong code is rejected')
  }

  /* ---------- 4. the right code verifies and returns a session ---------- */
  const client = fresh()
  {
    const { data, error } = await client.auth.verifyOtp({
      email,
      token: signup.properties.email_otp,
      type: 'signup',
    })
    ok(!error && Boolean(data.session), 'the emailed code signs the parent in')
    ok(Boolean(data.user?.email_confirmed_at), 'verifying marks the email confirmed')
  }

  /* ---------- 5. the same code cannot be replayed ---------- */
  {
    const { error } = await fresh().auth.verifyOtp({
      email,
      token: signup.properties.email_otp,
      type: 'signup',
    })
    ok(Boolean(error), 'a used code cannot be replayed')
  }

  /* ---------- 6. the stashed invite redeems as the new parent ---------- */
  {
    const { error } = await client.rpc('redeem_invite_code', { _code: code })
    ok(!error, `stashed invite redeems after verification${error ? ` — ${error.message}` : ''}`)
    const { data: after } = await db
      .from('children')
      .select('parent_user_id')
      .eq('id', childId)
      .single()
    ok(after?.parent_user_id === userId, 'the child is linked to that parent')
  }

  /* ---------- 7. THE POINT: every later sign-in is password only ---------- */
  {
    const { data, error } = await fresh().auth.signInWithPassword({ email, password })
    ok(!error && Boolean(data.session), 'second sign-in succeeds with NO code')
  }
  {
    const { data, error } = await fresh().auth.signInWithPassword({ email, password })
    ok(!error && Boolean(data.session), 'third sign-in also needs no code')
  }

  /* ---------- 8. re-registering an existing address is harmless ---------- *
   * Supabase rejects a signup call on a confirmed address, so a password can
   * never be overwritten this way. What matters is that the rejection is not
   * shown to the visitor: startRegistration answers identically whether or not
   * the address is known, so the form cannot be used to test who is a customer.
   */
  {
    const victimEmail = `victim-${randomBytes(4).toString('hex')}@example.test`
    const victimPassword = 'Real!' + randomBytes(10).toString('hex')
    const { data: made } = await db.auth.admin.createUser({
      email: victimEmail,
      password: victimPassword,
      email_confirm: true,
    })
    victimId = made.user.id

    const { error: rejected } = await db.auth.admin.generateLink({
      type: 'signup',
      email: victimEmail,
      password: 'Pwn!' + randomBytes(10).toString('hex'),
    })
    ok(
      /already been registered/i.test(rejected?.message ?? ''),
      'Supabase refuses a signup call on an existing confirmed address'
    )

    const { error: stillWorks } = await fresh().auth.signInWithPassword({
      email: victimEmail,
      password: victimPassword,
    })
    ok(!stillWorks, 'their original password is untouched')
  }
} finally {
  if (userId) await db.auth.admin.deleteUser(userId).catch(() => {})
  if (victimId) await db.auth.admin.deleteUser(victimId).catch(() => {})
  if (childId) await db.from('children').delete().eq('id', childId)
  console.log('cleaned up test data')
}

console.log('')
for (const p of pass) console.log(`  PASS  ${p}`)
for (const f of fail) console.log(`  FAIL  ${f}`)
console.log(`\n${pass.length} passed, ${fail.length} failed`)
process.exit(fail.length ? 1 : 0)
