import { site } from '@/lib/site'
import { escapeHtml } from '@/lib/html'
import { formatPrice } from '@/lib/utils'

/**
 * Email templates as plain functions returning HTML strings.
 *
 * Deliberately inline-styled and table-free where possible: email clients are
 * inconsistent, and these need to render in Gmail, Outlook and iOS Mail. Every
 * interpolated value is escaped — this content comes from user input.
 */

const BRAND = {
  coral: '#E8613C',
  teal: '#1E7A70',
  ink: '#12181F',
  muted: '#6B7684',
  line: '#E5EAE8',
  canvas: '#F5F7F6',
}

function shell(inner: string, preheader = ''): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.canvas};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.canvas};padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid ${BRAND.line};border-radius:16px;overflow:hidden">
        <tr><td style="padding:26px 30px 0">
          <div style="font-size:19px;font-weight:800;color:${BRAND.ink};letter-spacing:-0.02em">${site.name}</div>
          <div style="font-size:12px;color:${BRAND.muted};margin-top:2px">${site.tagline}</div>
        </td></tr>
        <tr><td style="padding:22px 30px 30px;color:${BRAND.ink};font-size:15px;line-height:1.65">
          ${inner}
        </td></tr>
      </table>
      <div style="max-width:560px;margin:16px auto 0;font-size:11.5px;color:${BRAND.muted};line-height:1.6;text-align:center">
        ${site.name} · ${site.owner}<br>
        <a href="mailto:${site.contact.email}" style="color:${BRAND.muted}">${site.contact.email}</a>
      </div>
    </td></tr>
  </table>
</body></html>`
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.coral};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px">${escapeHtml(label)}</a>`
}

/* -------------------------------------------------------------------------- */
/*  Free download                                                             */
/* -------------------------------------------------------------------------- */
export function freeDownloadEmail(args: {
  name?: string | null
  productName: string
  downloadUrl: string
}) {
  const greeting = args.name ? `Hi ${escapeHtml(args.name)},` : 'Hello,'
  return {
    subject: `Your download: ${args.productName}`,
    html: shell(
      `
      <p style="margin:0 0 14px">${greeting}</p>
      <p style="margin:0 0 18px">Here's your copy of <strong>${escapeHtml(args.productName)}</strong>. Tap below and it will download straight away.</p>
      <p style="margin:0 0 22px">${button(args.downloadUrl, 'Download now')}</p>
      <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted}">This link works for 30 days and can be used as often as you like. If it ever expires, just ask and I'll send a fresh one.</p>
      <p style="margin:22px 0 0">I hope it's useful,<br><strong>${site.owner}</strong></p>
    `,
      `Your copy of ${args.productName} is ready to download.`
    ),
    text: `${args.name ? `Hi ${args.name},` : 'Hello,'}\n\nHere's your copy of ${args.productName}:\n${args.downloadUrl}\n\nThis link works for 30 days.\n\n${site.owner}\n${site.name}`,
  }
}

/* -------------------------------------------------------------------------- */
/*  Order receipt                                                             */
/* -------------------------------------------------------------------------- */
export function orderReceiptEmail(args: {
  name: string
  orderNumber: string
  items: { name: string; pricePence: number }[]
  totalPence: number
  downloadUrl: string
}) {
  const rows = args.items
    .map(
      (i) =>
        `<tr><td style="padding:9px 0;border-bottom:1px solid ${BRAND.line}">${escapeHtml(i.name)}</td>
         <td align="right" style="padding:9px 0;border-bottom:1px solid ${BRAND.line};white-space:nowrap">${formatPrice(i.pricePence)}</td></tr>`
    )
    .join('')

  return {
    subject: `Your order ${args.orderNumber} — ready to download`,
    html: shell(
      `
      <p style="margin:0 0 14px">Hi ${escapeHtml(args.name)},</p>
      <p style="margin:0 0 18px">Thank you! Your order is confirmed and your files are ready.</p>
      <p style="margin:0 0 24px">${button(args.downloadUrl, 'Get my files')}</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:0 0 6px">
        <tr><td colspan="2" style="padding-bottom:6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${BRAND.teal}">Order ${escapeHtml(args.orderNumber)}</td></tr>
        ${rows}
        <tr><td style="padding:11px 0;font-weight:800">Total</td>
            <td align="right" style="padding:11px 0;font-weight:800">${formatPrice(args.totalPence)}</td></tr>
      </table>

      <p style="margin:16px 0 0;font-size:13px;color:${BRAND.muted}">Your download link works for 30 days. Create an account with this email address and your files stay in your library permanently.</p>
      <p style="margin:20px 0 0;font-size:12px;color:${BRAND.muted}">Digital content — supplied immediately with your consent, so the 14-day cancellation right does not apply. Keep this email as your receipt.</p>
      <p style="margin:20px 0 0">Thank you,<br><strong>${site.owner}</strong></p>
    `,
      `Order ${args.orderNumber} confirmed — your files are ready.`
    ),
    text: `Hi ${args.name},\n\nYour order ${args.orderNumber} is confirmed.\n\nDownload: ${args.downloadUrl}\n\n${args.items.map((i) => `${i.name} — ${formatPrice(i.pricePence)}`).join('\n')}\nTotal: ${formatPrice(args.totalPence)}\n\n${site.owner}`,
  }
}

/* -------------------------------------------------------------------------- */
/*  Parent portal — new homework                                              */
/* -------------------------------------------------------------------------- */
export function homeworkPostedEmail(args: {
  childName: string
  title: string
  description?: string | null
  dueDate?: string | null
  hasAttachment: boolean
  portalUrl: string
}) {
  const due = args.dueDate
    ? new Date(args.dueDate).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null

  return {
    subject: `New homework for ${args.childName}: ${args.title}`,
    html: shell(
      `
      <p style="margin:0 0 14px">Hello,</p>
      <p style="margin:0 0 18px">I've set some new work for <strong>${escapeHtml(args.childName)}</strong>.</p>

      <div style="background:#EFF3F1;border-radius:12px;padding:16px 18px;margin:0 0 20px">
        <div style="font-size:16px;font-weight:800;color:${BRAND.ink}">${escapeHtml(args.title)}</div>
        ${args.description ? `<p style="margin:8px 0 0;font-size:14px;color:${BRAND.muted}">${escapeHtml(args.description)}</p>` : ''}
        ${due ? `<p style="margin:10px 0 0;font-size:13px;font-weight:700;color:${BRAND.coral}">Due ${escapeHtml(due)}</p>` : ''}
        ${args.hasAttachment ? `<p style="margin:8px 0 0;font-size:13px;color:${BRAND.muted}">📎 There's a file to download in the portal.</p>` : ''}
      </div>

      <p style="margin:0 0 22px">${button(args.portalUrl, 'Open the parent portal')}</p>
      <p style="margin:0;font-size:13px;color:${BRAND.muted}">Any questions, just reply to this email or send me a WhatsApp.</p>
      <p style="margin:20px 0 0">Thanks,<br><strong>${site.owner}</strong></p>
    `,
      `New homework for ${args.childName}: ${args.title}`
    ),
    text: `New homework for ${args.childName}\n\n${args.title}\n${args.description ?? ''}\n${due ? `Due ${due}\n` : ''}\nOpen the portal: ${args.portalUrl}\n\n${site.owner}`,
  }
}

/* -------------------------------------------------------------------------- */
/*  Parent portal — new lesson feedback                                       */
/* -------------------------------------------------------------------------- */
export function feedbackPostedEmail(args: {
  childName: string
  note: string
  lessonDate?: string | null
  portalUrl: string
}) {
  const when = args.lessonDate
    ? new Date(args.lessonDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return {
    subject: `Lesson feedback for ${args.childName}`,
    html: shell(
      `
      <p style="margin:0 0 14px">Hello,</p>
      <p style="margin:0 0 18px">Here's how <strong>${escapeHtml(args.childName)}</strong> got on${when ? ` on ${escapeHtml(when)}` : ''}.</p>

      <blockquote style="margin:0 0 20px;padding:2px 0 2px 16px;border-left:3px solid ${BRAND.teal};color:${BRAND.ink};font-size:15px;line-height:1.7">
        ${escapeHtml(args.note).replace(/\n/g, '<br>')}
      </blockquote>

      <p style="margin:0 0 22px">${button(args.portalUrl, 'See all their notes')}</p>
      <p style="margin:20px 0 0">Best wishes,<br><strong>${site.owner}</strong></p>
    `,
      `Lesson feedback for ${args.childName}`
    ),
    text: `Lesson feedback for ${args.childName}${when ? ` — ${when}` : ''}\n\n${args.note}\n\nPortal: ${args.portalUrl}\n\n${site.owner}`,
  }
}

/* -------------------------------------------------------------------------- */
/*  Owner notification — a sale just happened                                 */
/* -------------------------------------------------------------------------- */
export function ownerSaleEmail(args: {
  orderNumber: string
  customerName: string
  customerEmail: string
  items: { name: string; pricePence: number }[]
  totalPence: number
  isFree: boolean
}) {
  const rows = args.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid ${BRAND.line}">${escapeHtml(i.name)}</td>
         <td align="right" style="padding:8px 0;border-bottom:1px solid ${BRAND.line}">${formatPrice(i.pricePence)}</td></tr>`
    )
    .join('')

  const heading = args.isFree ? 'Free resource downloaded' : 'You made a sale!'

  return {
    subject: args.isFree
      ? `Free download — ${args.items[0]?.name ?? 'resource'} (${args.orderNumber})`
      : `Sale: ${formatPrice(args.totalPence)} — ${args.orderNumber}`,
    html: shell(
      `
      <h2 style="margin:0 0 6px;font-size:20px">${heading}</h2>
      <p style="margin:0 0 18px;color:${BRAND.muted};font-size:14px">Order ${escapeHtml(args.orderNumber)}</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
        <tr><td style="padding:6px 0"><strong>Customer</strong></td><td align="right">${escapeHtml(args.customerName)}</td></tr>
        <tr><td style="padding:6px 0"><strong>Email</strong></td><td align="right">${escapeHtml(args.customerEmail)}</td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0 0">
        ${rows}
        <tr><td style="padding:10px 0;font-weight:800">Total</td>
            <td align="right" style="padding:10px 0;font-weight:800">${formatPrice(args.totalPence)}</td></tr>
      </table>

      <p style="margin:20px 0 0;font-size:13px;color:${BRAND.muted}">The customer already has their download link. Nothing to do unless they get in touch.</p>
    `,
      `${heading} — ${args.orderNumber}`
    ),
    text: `${heading}\nOrder ${args.orderNumber}\nCustomer: ${args.customerName} (${args.customerEmail})\n${args.items.map((i) => `${i.name} — ${formatPrice(i.pricePence)}`).join('\n')}\nTotal: ${formatPrice(args.totalPence)}`,
  }
}

/* -------------------------------------------------------------------------- */
/*  Download link re-issue                                                    */
/* -------------------------------------------------------------------------- */
export function reissueEmail(args: { downloadUrl: string }) {
  return {
    subject: 'Your fresh download link',
    html: shell(
      `
      <p style="margin:0 0 14px">Hello,</p>
      <p style="margin:0 0 18px">Here's a new link to your files — the previous one had expired.</p>
      <p style="margin:0 0 22px">${button(args.downloadUrl, 'Download now')}</p>
      <p style="margin:0;font-size:13px;color:${BRAND.muted}">This one works for another 30 days.</p>
      <p style="margin:20px 0 0"><strong>${site.owner}</strong></p>
    `,
      'A fresh download link for your files.'
    ),
    text: `Here's a fresh download link (valid 30 days):\n${args.downloadUrl}\n\n${site.owner}`,
  }
}

/* -------------------------------------------------------------------------- */
/*  Auth — these replace Supabase's own unbranded emails                      */
/* -------------------------------------------------------------------------- */

/**
 * The verification code screen's email.
 *
 * The code is the whole message, so it gets the visual weight: large, spaced,
 * monospace, selectable as text. No button competes with it, because a parent
 * reading this on a phone needs to memorise six-to-eight digits for four
 * seconds and nothing else.
 */
export function verifyCodeEmail(args: { code: string; minutes?: number }) {
  const mins = args.minutes ?? 60
  return {
    subject: `${args.code} is your ${site.shortName} code`,
    html: shell(
      `
      <p style="margin:0 0 6px;font-size:17px;font-weight:800;color:${BRAND.ink}">Confirm your email</p>
      <p style="margin:0 0 20px">Enter this code on the page you just came from and your account is ready.</p>
      <div style="margin:0 0 20px;padding:18px 20px;background:${BRAND.canvas};border:1px solid ${BRAND.line};border-radius:14px;text-align:center">
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:32px;font-weight:800;letter-spacing:0.16em;color:${BRAND.teal}">${escapeHtml(args.code)}</div>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted}">The code expires in ${mins} minutes and can only be used once. You&rsquo;ll only need to do this the first time — after that it&rsquo;s just your email and password.</p>
      <p style="margin:0;font-size:13px;color:${BRAND.muted}">Didn&rsquo;t try to sign in? You can ignore this email; nothing has changed.</p>
      <p style="margin:22px 0 0"><strong>${site.owner}</strong></p>
    `,
      `Your code is ${args.code}`
    ),
    text: `Confirm your email\n\nYour ${site.shortName} code is: ${args.code}\n\nIt expires in ${mins} minutes and can only be used once. You'll only need this the first time.\n\nDidn't try to sign in? Ignore this email.\n\n${site.owner}`,
  }
}

/** Branded replacement for Supabase's "Your sign-in link". */
export function signInLinkEmail(args: { url: string; firstTime?: boolean }) {
  return {
    subject: args.firstTime
      ? `Confirm your ${site.shortName} account`
      : `Your ${site.shortName} sign-in link`,
    html: shell(
      `
      <p style="margin:0 0 6px;font-size:17px;font-weight:800;color:${BRAND.ink}">${
        args.firstTime ? 'Confirm your email' : 'Sign in'
      }</p>
      <p style="margin:0 0 20px">${
        args.firstTime
          ? 'Tap the button below to confirm your address and finish setting up your account.'
          : 'Tap the button below and you&rsquo;ll be signed straight in.'
      }</p>
      <p style="margin:0 0 22px">${button(args.url, args.firstTime ? 'Confirm my email' : 'Sign me in')}</p>
      <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted}">This link expires in an hour and works once.${
        args.firstTime
          ? ' After this you&rsquo;ll sign in with just your email and password.'
          : ''
      }</p>
      <p style="margin:0;font-size:13px;color:${BRAND.muted}">Didn&rsquo;t request this? You can ignore this email; nothing has changed.</p>
      <p style="margin:22px 0 0"><strong>${site.owner}</strong></p>
    `,
      args.firstTime ? 'Confirm your email address.' : 'Your sign-in link is ready.'
    ),
    text: `${args.firstTime ? 'Confirm your email' : 'Sign in'}\n\n${args.url}\n\nThis link expires in an hour and works once.\n\nDidn't request this? Ignore this email.\n\n${site.owner}`,
  }
}

/**
 * Sent when someone tries to register with an address that already has an
 * account. Registration itself must not reveal that the account exists, so the
 * on-screen message is identical either way and the difference is only ever
 * visible to whoever controls the inbox.
 */
export function accountExistsEmail(args: { url: string }) {
  return {
    subject: `You already have a ${site.shortName} account`,
    html: shell(
      `
      <p style="margin:0 0 14px">Hello,</p>
      <p style="margin:0 0 18px">Someone just tried to create an account with this email address — but you already have one, so we haven&rsquo;t made a second.</p>
      <p style="margin:0 0 22px">${button(args.url, 'Sign me in')}</p>
      <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted}">If you&rsquo;ve forgotten your password, use &ldquo;Forgotten your password?&rdquo; on the sign-in page.</p>
      <p style="margin:0;font-size:13px;color:${BRAND.muted}">If this wasn&rsquo;t you, nothing has changed and your password is untouched. You can safely ignore this.</p>
      <p style="margin:22px 0 0"><strong>${site.owner}</strong></p>
    `,
      'You already have an account — here is a sign-in link.'
    ),
    text: `You already have a ${site.shortName} account, so we haven't created a second one.\n\nSign in: ${args.url}\n\nIf this wasn't you, nothing has changed.\n\n${site.owner}`,
  }
}

/** Branded replacement for Supabase's password-reset email. */
export function passwordResetEmail(args: { url: string }) {
  return {
    subject: `Reset your ${site.shortName} password`,
    html: shell(
      `
      <p style="margin:0 0 6px;font-size:17px;font-weight:800;color:${BRAND.ink}">Choose a new password</p>
      <p style="margin:0 0 20px">Tap below to set a new password. The link works once and expires in an hour.</p>
      <p style="margin:0 0 22px">${button(args.url, 'Set a new password')}</p>
      <p style="margin:0;font-size:13px;color:${BRAND.muted}">Didn&rsquo;t ask for this? Ignore this email — your password stays as it is.</p>
      <p style="margin:22px 0 0"><strong>${site.owner}</strong></p>
    `,
      'Reset your password.'
    ),
    text: `Choose a new password\n\n${args.url}\n\nThe link works once and expires in an hour. Didn't ask for this? Ignore this email.\n\n${site.owner}`,
  }
}
