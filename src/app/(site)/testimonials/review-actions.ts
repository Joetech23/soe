'use server'

import { headers } from 'next/headers'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { hit } from '@/lib/api-guard'
import { REVIEW_TOPICS } from '@/lib/reviews'

export type ReviewResult = { ok: boolean; message: string }

function ip(): string {
  const h = headers()
  return h.get('x-forwarded-for')?.split(',')[0].trim() ?? h.get('x-real-ip') ?? 'unknown'
}

/**
 * Accepts a parent's review and holds it for approval.
 *
 * Nothing written here can reach the website on its own: the row is forced to
 * `status = 'pending'` server-side, and the public read policy only exposes
 * approved rows. The status is never taken from the form.
 */
export async function submitReview(fd: FormData): Promise<ReviewResult> {
  const name = String(fd.get('authorName') ?? '').trim().replace(/\s+/g, ' ').slice(0, 60)
  const email = String(fd.get('authorEmail') ?? '').trim().toLowerCase().slice(0, 254)
  const topicRaw = String(fd.get('topic') ?? '').trim()
  const quote = String(fd.get('quote') ?? '').trim().slice(0, 1500)
  const ratingRaw = Number(fd.get('rating') ?? 5)
  const honeypot = String(fd.get('website') ?? '')

  // Bots fill every field they find; people never see this one.
  if (honeypot) return { ok: true, message: 'Thank you — your review has been sent.' }

  if (name.length < 2) return { ok: false, message: 'Please tell us your name.' }
  if (quote.length < 20) {
    return { ok: false, message: 'Please write a little more — at least a sentence or two.' }
  }
  if (email && !/^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, message: 'That email address does not look right.' }
  }

  const rating = Number.isFinite(ratingRaw) ? Math.min(5, Math.max(1, Math.round(ratingRaw))) : 5
  // Only offer the headings we actually use, so the site stays consistent.
  const topic = (REVIEW_TOPICS as readonly string[]).includes(topicRaw) ? topicRaw : null

  const guard = hit(`review:${ip()}`, 3, 60 * 60 * 1000)
  if (!guard.ok) {
    return { ok: false, message: 'Thanks — you have already sent a review recently.' }
  }

  if (!hasAdminCredentials()) {
    return { ok: false, message: 'Reviews are temporarily unavailable. Please try later.' }
  }

  // Attribute it to the signed-in parent when there is one, but never require it.
  let userId: string | null = null
  try {
    const { data } = await createClient().auth.getUser()
    userId = data.user?.id ?? null
  } catch {
    /* signed out is the normal case */
  }

  try {
    const { error } = await createAdminClient().from('reviews').insert({
      author_name: name,
      author_email: email || null,
      topic,
      rating,
      quote,
      status: 'pending', // never from the form
      user_id: userId,
      ip: ip(),
    })
    if (error) {
      if (/does not exist|schema cache/i.test(error.message)) {
        return {
          ok: false,
          message: 'Reviews are not switched on yet. Please try again shortly.',
        }
      }
      throw error
    }
  } catch (err) {
    console.error('[reviews] submit failed:', err instanceof Error ? err.message : err)
    return { ok: false, message: 'Could not send your review. Please try again.' }
  }

  return {
    ok: true,
    message: 'Thank you! Ms Betty will read it before it appears on the site.',
  }
}
