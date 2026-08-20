/**
 * Resumable (TUS) upload for files too big for a single request.
 *
 * The plain storage upload drops on a ~180 MB body; Supabase's own guidance is
 * to use resumable uploads above ~6 MB. This sends 6 MB chunks and reports
 * progress, so a long upload is visible rather than looking hung.
 *
 *   node scripts/upload-large-file.mjs <local-file> <bucket> <object-key>
 */
import { readFileSync, statSync } from 'node:fs'

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l.trim())
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
}
const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const [file, bucket, key] = process.argv.slice(2)
if (!file || !bucket || !key) throw new Error('usage: <file> <bucket> <key>')

const size = statSync(file).size
const bytes = readFileSync(file)
const contentType = key.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream'
const CHUNK = 6 * 1024 * 1024

const meta = Object.entries({
  bucketName: bucket,
  objectName: key,
  contentType,
  cacheControl: '3600',
})
  .map(([k, v]) => `${k} ${Buffer.from(String(v)).toString('base64')}`)
  .join(',')

console.log(`Creating resumable upload: ${(size / 1048576).toFixed(1)} MB -> ${bucket}/${key}`)
const create = await fetch(`${URL_BASE}/storage/v1/upload/resumable`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${KEY}`,
    apikey: KEY,
    'Tus-Resumable': '1.0.0',
    'Upload-Length': String(size),
    'Upload-Metadata': meta,
  },
})
if (!create.ok) {
  console.error(`create failed ${create.status}: ${(await create.text()).slice(0, 300)}`)
  process.exit(1)
}
const location = create.headers.get('location')
if (!location) { console.error('no Location header'); process.exit(1) }

let offset = 0
while (offset < size) {
  const end = Math.min(offset + CHUNK, size)
  const res = await fetch(location, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${KEY}`,
      apikey: KEY,
      'Tus-Resumable': '1.0.0',
      'Upload-Offset': String(offset),
      'Content-Type': 'application/offset+octet-stream',
    },
    body: bytes.subarray(offset, end),
  })
  if (!res.ok) {
    console.error(`chunk at ${offset} failed ${res.status}: ${(await res.text()).slice(0, 300)}`)
    process.exit(1)
  }
  offset = Number(res.headers.get('upload-offset') ?? end)
  process.stdout.write(`\r  ${((offset / size) * 100).toFixed(0)}%  (${(offset / 1048576).toFixed(0)} MB)`)
}
console.log('\nDone.')
