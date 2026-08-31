import { NextResponse } from 'next/server'
import { bookingRequestSchema } from '@/lib/schemas'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { rateLimit, readJson, badRequest, serverError, sameOrigin } from '@/lib/api-guard'
import { sendEmail, redact } from '@/lib/email/send'
import { enquiryOwnerEmail, enquiryParentEmail } from '@/lib/email/templates'
import { site } from '@/lib/site'
import { siteUrl } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TERMS_VERSION = 'v1'

function reference() {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
  let out = 'ENQ-'
  const bytes = crypto.getRandomValues(new Uint8Array(5))
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

export async function POST(request: Request) {
  // 1. Origin + rate limit before any work.
  if (!sameOrigin(request)) return badRequest('We could not verify that request came from this page. Please refresh and try again.', 403)
  const limited = rateLimit(request, 'bookings', 5, 60_000)
  if (limited) return limited

  // 2. Size-capped JSON.
  const json = await readJson(request)
  if (json === null) return badRequest('Invalid request.')

  // 3. Schema validation.
  const parsed = bookingRequestSchema.safeParse(json)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Please check the form.')
  }
  const d = parsed.data

  // 4. Honeypot — accept silently so bots learn nothing.
  // Honeypot. Answer as though it worked so a bot learns nothing — but log
  // it, because a trap that fires on a real person is otherwise invisible:
  // they see "sent" and never receive anything.
  if (d.hpRef) {
    console.warn(`[bookings] honeypot tripped — no action taken`)
    return NextResponse.json({ ok: true })
  }

  if (!hasAdminCredentials()) {
    console.error('[bookings] Supabase not configured — request dropped')
    return NextResponse.json(
      { error: 'Bookings are being set up. Please WhatsApp Ms Betty for now.' },
      { status: 503 }
    )
  }

  try {
    const supabase = createAdminClient()
    const ref = reference()

    const { error } = await supabase.from('booking_requests').insert({
      reference: ref,
      intent: d.intent,
      parent_name: d.parentName,
      email: d.email,
      phone: d.phone || null,
      child_name: d.childName,
      year_group: d.yearGroup,
      subject: d.subject,
      notes: d.notes || null,
      terms_version: TERMS_VERSION,
      status: d.intent === 'waitlist' ? 'waitlist' : 'new',
    })
    if (error) throw error

    // 5. Notify. Email failures must not fail the request — the enquiry is
    //    already safely stored and visible in the admin panel.
    //
    //    Both mails go through the shared branded template rather than inline
    //    HTML. The owner copy in particular is delivered to a mailbox on the
    //    same domain it is sent from, which is where filters are strictest.
    const owner = process.env.OWNER_NOTIFICATION_EMAIL ?? site.contact.email

    const ownerMail = enquiryOwnerEmail({
      reference: ref,
      intent: d.intent,
      parentName: d.parentName,
      parentEmail: d.email,
      phone: d.phone,
      childName: d.childName,
      yearGroup: d.yearGroup,
      subject: d.subject,
      notes: d.notes,
      enquiryUrl: siteUrl('/admin/enquiries'),
    })

    const parentMail = enquiryParentEmail({
      reference: ref,
      intent: d.intent,
      parentName: d.parentName,
      childName: d.childName,
      replyTime: site.contact.replyTime,
      whatsapp: site.contact.whatsappDisplay,
    })

    await Promise.allSettled([
      sendEmail({
        to: owner,
        replyTo: d.email,
        tag: 'enquiry-owner',
        subject: ownerMail.subject,
        html: ownerMail.html,
        text: ownerMail.text,
      }),
      sendEmail({
        to: d.email,
        tag: 'enquiry-parent',
        subject: parentMail.subject,
        html: parentMail.html,
        text: parentMail.text,
      }),
    ])

    console.info(`[bookings] stored ${ref} for ${redact(d.email)}`)
    return NextResponse.json({ ok: true, reference: ref })
  } catch (err) {
    return serverError('bookings', err)
  }
}
