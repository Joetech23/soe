/**
 * Escapes user-supplied text before it is interpolated into an HTML email.
 *
 * Without this, a parent's "notes" field could inject markup (or a link) into
 * the email Ms Betty opens. Zod validates shape and length, not content.
 */
const MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
}

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"'/]/g, (c) => MAP[c] ?? c)
}
