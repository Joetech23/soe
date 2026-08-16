import { NextResponse } from 'next/server'
import { bookingRequestSchema } from '@/lib/schemas'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { rateLimit, readJson, badRequest, serverError, sameOrigin } from '@/lib/api-guard'
import { sendEmail, redact } from '@/lib/email/send'
import { site } from '@/lib/site'
import { escapeHtml } from '@/lib/html'

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
  if (!sameOrigin(request)) return badRequest('Invalid request origin.', 403)
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
  if (d.company) return NextResponse.json({ ok: true })

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
    const owner = process.env.OWNER_NOTIFICATION_EMAIL ?? site.contact.email
    const esc = {
      ref,
      parent: escapeHtml(d.parentName),
      email: escapeHtml(d.email),
      phone: escapeHtml(d.phone || '—'),
      child: escapeHtml(d.childName),
      year: escapeHtml(d.yearGroup),
      subject: escapeHtml(d.subject),
      notes: escapeHtml(d.notes || '—'),
      intent: d.intent === 'waitlist' ? 'Waiting list' : 'Booking request',
    }

    await Promise.allSettled([
      sendEmail({
        to: owner,
        replyTo: d.email,
        tag: 'enquiry-owner',
        subject: `${esc.intent}: ${esc.child} (${esc.year}) — ${ref}`,
        html: `
          <h2 style="font-family:system-ui">${esc.intent}</h2>
          <p style="font-family:system-ui"><strong>Reference:</strong> ${ref}</p>
          <table style="font-family:system-ui;border-collapse:collapse">
            <tr><td><strong>Parent</strong></td><td>${esc.parent}</td></tr>
            <tr><td><strong>Email</strong></td><td>${esc.email}</td></tr>
            <tr><td><strong>Phone</strong></td><td>${esc.phone}</td></tr>
            <tr><td><strong>Child</strong></td><td>${esc.child}</td></tr>
            <tr><td><strong>Year group</strong></td><td>${esc.year}</td></tr>
            <tr><td><strong>Focus</strong></td><td>${esc.subject}</td></tr>
          </table>
          <p style="font-family:system-ui"><strong>Notes:</strong><br>${esc.notes}</p>
        `,
        text: `${esc.intent} ${ref}\nParent: ${d.parentName}\nEmail: ${d.email}\nChild: ${d.childName} (${d.yearGroup})\nFocus: ${d.subject}\nNotes: ${d.notes || '—'}`,
      }),
      sendEmail({
        to: d.email,
        tag: 'enquiry-parent',
        subject: `We've got your ${d.intent === 'waitlist' ? 'waiting list request' : 'booking request'} — ${ref}`,
        html: `
          <div style="font-family:system-ui;line-height:1.6">
            <h2>Thank you, ${esc.parent}</h2>
            <p>${
              d.intent === 'waitlist'
                ? `You're on the waiting list for ${esc.child}. Ms Betty will email the moment a space opens up.`
                : `Ms Betty has your booking request for ${esc.child} and will be in touch within ${site.contact.replyTime} with availability and next steps.`
            }</p>
            <p>Your reference is <strong>${ref}</strong>.</p>
            <p>If anything changes, just reply to this email or WhatsApp ${site.contact.whatsappDisplay}.</p>
            <p>— ${site.owner}<br>${site.name}</p>
          </div>
        `,
        text: `Thank you, ${d.parentName}. Reference ${ref}. Ms Betty will be in touch within ${site.contact.replyTime}.`,
      }),
    ])

    console.info(`[bookings] stored ${ref} for ${redact(d.email)}`)
    return NextResponse.json({ ok: true, reference: ref })
  } catch (err) {
    return serverError('bookings', err)
  }
}
