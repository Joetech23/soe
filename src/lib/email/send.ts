import 'server-only'

/**
 * The single seam for all outbound email.
 *
 * Everything in the app sends through `sendEmail`, so switching provider (or
 * adding a queue, or suppressing sends in staging) is a one-file change.
 *
 * Behaviour without RESEND_API_KEY: logs and returns `skipped` rather than
 * throwing. That matters because a mail failure must never roll back an
 * entitlement grant — the customer's file access is more important than the
 * receipt, and the receipt can be re-sent.
 */
export type SendResult =
  | { status: 'sent'; id: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string }

type SendArgs = {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  /** Tags help find a specific send in the provider dashboard later. */
  tag?: string
}

const FROM = process.env.EMAIL_FROM ?? 'Ms Betty <onboarding@resend.dev>'
const REPLY_TO = process.env.EMAIL_REPLY_TO

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipped "${args.subject}" to ${redact(args.to)}`
    )
    return { status: 'skipped', reason: 'no_api_key' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
        reply_to: args.replyTo ?? REPLY_TO,
        tags: args.tag ? [{ name: 'kind', value: args.tag }] : undefined,
      }),
      // Never let a hanging mail API stall a checkout response.
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[email] provider ${res.status}: ${body.slice(0, 300)}`)
      return { status: 'failed', reason: `provider_${res.status}` }
    }

    const json = (await res.json()) as { id?: string }
    return { status: 'sent', id: json.id ?? 'unknown' }
  } catch (err) {
    console.error('[email] send failed', err)
    return { status: 'failed', reason: 'exception' }
  }
}

/** Never write a full address into logs. */
export function redact(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain) return '***'
  return `${user.slice(0, 2)}***@${domain}`
}
