import { NextResponse } from 'next/server'
import { newsletterSchema } from '@/lib/schemas'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import {
  rateLimit,
  readJson,
  badRequest,
  serverError,
  sameOrigin,
  clientIp,
} from '@/lib/api-guard'
import { mintToken, hashToken } from '@/lib/downloads'
import { sendEmail, redact } from '@/lib/email/send'
import { escapeHtml } from '@/lib/html'
import { site } from '@/lib/site'
import { siteUrl } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Double opt-in signup.
 *
 * UK GDPR/PECR: consent must be freely given and provable. We store the exact
 * wording the person agreed to plus their IP, and nobody is marked `confirmed`
 * until they click the link in the confirmation email.
 */
const CONSENT_TEXT =
  'Signed up on the Spirit of Excellence Tuition newsletter page to receive occasional learning tips, reading recommendations and free resources by email. Unsubscribe any time.'

export async function POST(request: Request) {
  if (!sameOrigin(request)) return badRequest('Invalid request origin.', 403)
  const limited = rateLimit(request, 'newsletter', 5, 60_000)
  if (limited) return limited

  const json = await readJson(request)
  if (json === null) return badRequest('Invalid request.')

  const parsed = newsletterSchema.safeParse(json)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Please check the form.')
  }
  const d = parsed.data
  if (d.company) return NextResponse.json({ ok: true })

  if (!hasAdminCredentials()) {
    console.error('[newsletter] Supabase not configured — signup dropped')
    return NextResponse.json(
      { error: 'The newsletter is being set up. Please try again soon.' },
      { status: 503 }
    )
  }

  try {
    const supabase = createAdminClient()
    const email = d.email.trim().toLowerCase()

    // Already confirmed? Say the same thing either way — never disclose whether
    // an address is on the list (that is an enumeration leak).
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email)
      .maybeSingle()

    if (existing?.status === 'confirmed') {
      return NextResponse.json({ ok: true })
    }

    const raw = mintToken()
    const { error } = await supabase.from('newsletter_subscribers').upsert(
      {
        email,
        full_name: d.name,
        child_year_group: d.childYear || null,
        status: 'pending',
        source: 'newsletter_page',
        confirm_token_hash: hashToken(raw),
        consent_ip: clientIp(request),
        consent_text: CONSENT_TEXT,
        unsubscribed_at: null,
      },
      { onConflict: 'email' }
    )
    if (error) throw error

    const confirmUrl = siteUrl(
      `/api/newsletter/confirm?token=${encodeURIComponent(raw)}`
    )

    await sendEmail({
      to: email,
      tag: 'newsletter-confirm',
      subject: 'Please confirm your newsletter subscription',
      html: `
        <div style="font-family:system-ui;line-height:1.6">
          <h2>Almost there, ${escapeHtml(d.name)}</h2>
          <p>Tap the button below to confirm you'd like ${site.owner}'s parent
          newsletter. If you didn't request this, just ignore this email — nothing
          will be sent.</p>
          <p style="margin:28px 0">
            <a href="${confirmUrl}"
               style="background:#E8613C;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">
              Confirm subscription
            </a>
          </p>
          <p style="font-size:13px;color:#6B7684">Or paste this into your browser:<br>${confirmUrl}</p>
          <p>— ${site.owner}<br>${site.name}</p>
        </div>
      `,
      text: `Confirm your subscription: ${confirmUrl}`,
    })

    console.info(`[newsletter] pending signup ${redact(email)}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError('newsletter', err)
  }
}
