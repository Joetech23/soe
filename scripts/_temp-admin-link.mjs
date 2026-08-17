import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
for (const line of readFileSync('.env.local','utf8').split(/\r?\n/)) { const m=/^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim()); if(m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g,'') }
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})
const MARK = 'verify-admin-'
if (process.argv.includes('--cleanup')) {
  const { data } = await db.auth.admin.listUsers({page:1,perPage:200})
  let n=0
  for (const u of data.users) if (u.email?.startsWith(MARK)) { await db.from('user_roles').delete().eq('user_id',u.id); await db.auth.admin.deleteUser(u.id); n++ }
  console.log(`removed ${n}`); process.exit(0)
}
const email = `${MARK}${randomBytes(3).toString('hex')}@soetuition.com`
const { data: made, error } = await db.auth.admin.createUser({ email, password: randomBytes(18).toString('base64url'), email_confirm: true })
if (error) throw error
await db.from('user_roles').insert({ user_id: made.user.id, role: 'admin' })
const { data: link } = await db.auth.admin.generateLink({ type:'magiclink', email })
const q = new URLSearchParams({ token_hash: link.properties.hashed_token, type:'magiclink', next:'/admin' })
console.log(`http://localhost:3012/auth/confirm?${q}`)
