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
