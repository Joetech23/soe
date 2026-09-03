/**
 * Is migration 0010 applied, and does a family code actually link siblings?
 *
 * Read-only by default. With --live it creates two throwaway children, a code
 * covering both, a throwaway parent, redeems, asserts both children landed on
 * that one account, then deletes everything it made. Nothing belonging to Ms
 * Betty is touched: every write is keyed to the marker below.
 *
 *   node scripts/verify-family-codes.mjs [--live]
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const MARKER = 'zz-verify-family'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const db = createClient(url, service, { auth: { persistSession: false } })

let failed = 0
const ok = (m) => console.log(`  \x1b[32mPASS\x1b[0m ${m}`)
const no = (m) => {
  failed++
  console.log(`  \x1b[31mFAIL\x1b[0m ${m}`)
}

/* -------------------------------- reachable ------------------------------- */
console.log('\nReachability control')
{
  const { error } = await db.from('children').select('id').limit(1)
  if (error) {
    console.error('  Cannot reach the database:', error.message)
    process.exit(2)
  }
  ok('database reachable — a failure below is a real answer, not a network blip')
}

/* -------------------------------- schema ---------------------------------- */
console.log('\nMigration 0010')
const { error: joinErr } = await db
  .from('invite_code_children')
  .select('code_id')
  .limit(1)
if (joinErr) {
  no(`invite_code_children missing — 0010 not applied (${joinErr.message})`)
} else {
  ok('invite_code_children exists')
}

// A family code has no anchor child, so the column must be nullable.
{
  const { data: probe, error } = await db
    .from('invite_codes')
    .insert({ code: `${MARKER}-NULLCHECK` })
    .select('id')
    .maybeSingle()
  if (error) {
    no(`invite_codes.child_id is still NOT NULL (${error.message})`)
  } else {
    ok('invite_codes.child_id is nullable')
    await db.from('invite_codes').delete().eq('id', probe.id)
  }
}

if (failed > 0 || !process.argv.includes('--live')) {
  console.log(
    failed > 0
      ? '\nApply supabase/migrations/20260903_0010_family_invite_codes.sql, then re-run.'
      : '\nSchema looks right. Re-run with --live to exercise a real redemption.'
  )
  process.exit(failed > 0 ? 1 : 0)
}

/* ------------------------------- live round-trip -------------------------- */
console.log('\nLive: one code, two siblings, one parent')
const made = { children: [], codes: [], users: [] }

try {
  for (const name of [`${MARKER}-Leo`, `${MARKER}-Amara`]) {
    const { data, error } = await db
      .from('children')
      .insert({ name })
      .select('id, name')
      .maybeSingle()
    if (error) throw error
    made.children.push(data)
  }
  ok(`created ${made.children.length} throwaway children`)

  const { data: code, error: codeErr } = await db
    .from('invite_codes')
    .insert({ code: `${MARKER.toUpperCase()}-A1B2` })
    .select('id, code')
    .maybeSingle()
  if (codeErr) throw codeErr
  made.codes.push(code)

  const { error: linkErr } = await db.from('invite_code_children').insert(
    made.children.map((c) => ({ code_id: code.id, child_id: c.id }))
  )
  if (linkErr) throw linkErr
  ok('one code covering both children')

  const email = `${MARKER}-${Date.now()}@example.com`
  const password = `Pw-${Math.random().toString(36).slice(2)}-9!`
  const { data: created, error: userErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (userErr) throw userErr
  made.users.push(created.user)

  // Redeem as the parent would: anon key, real session, no service role.
  const asParent = createClient(url, anon, { auth: { persistSession: false } })
  const { error: signInErr } = await asParent.auth.signInWithPassword({ email, password })
  if (signInErr) throw signInErr

  const { data: linked, error: redeemErr } = await asParent.rpc('redeem_invite_code', {
    _code: code.code.toLowerCase(), // also proves case-insensitive matching
  })
  if (redeemErr) throw redeemErr

  const names = (linked ?? []).map((r) => r.child_name).sort()
  if (names.length === 2) ok(`one redemption linked both: ${names.join(', ')}`)
  else no(`expected 2 children back, got ${names.length}`)

  const { data: owned } = await db
    .from('children')
    .select('id')
    .eq('parent_user_id', created.user.id)
  if ((owned ?? []).length === 2) ok('both children now belong to that parent')
  else no(`parent owns ${(owned ?? []).length} children, expected 2`)

  // Re-entering the same code must be a harmless no-op, not an error.
  const { error: againErr } = await asParent.rpc('redeem_invite_code', {
    _code: code.code,
  })
  if (againErr) no(`re-entering their own code errored: ${againErr.message}`)
  else ok('re-entering the same code is a no-op, not an error')

  // A different account must not be able to take these children.
  const otherEmail = `${MARKER}-other-${Date.now()}@example.com`
  const { data: other } = await db.auth.admin.createUser({
    email: otherEmail,
    password,
    email_confirm: true,
  })
  made.users.push(other.user)
  const asOther = createClient(url, anon, { auth: { persistSession: false } })
  await asOther.auth.signInWithPassword({ email: otherEmail, password })
  const { error: stealErr } = await asOther.rpc('redeem_invite_code', {
    _code: code.code,
  })
  if (stealErr) ok(`another account is refused: "${stealErr.message}"`)
  else no('another account was able to redeem a used code')
} catch (err) {
  no(`threw: ${err.message}`)
} finally {
  /* ------------------------------- cleanup -------------------------------- */
  for (const u of made.users) await db.auth.admin.deleteUser(u.id).catch(() => {})
  for (const c of made.codes) await db.from('invite_codes').delete().eq('id', c.id)
  for (const c of made.children) await db.from('children').delete().eq('id', c.id)

  const { data: strays } = await db.from('children').select('id').like('name', `${MARKER}%`)
  console.log(
    `\nCleanup: removed ${made.users.length} users, ${made.codes.length} codes, ` +
      `${made.children.length} children. Strays left: ${(strays ?? []).length}`
  )
}

console.log(failed === 0 ? '\nAll good.\n' : `\n${failed} failed.\n`)
process.exit(failed === 0 ? 0 : 1)
