import 'server-only'
import { cache } from 'react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { TESTIMONIALS, type Testimonial } from '@/lib/site'
import type { ReviewRow } from '@/lib/supabase/types'

/**
 * Approved reviews, ready to render.
 *
 * Parent-submitted reviews and the reviews Ms Betty already had are merged into
 * one list so the page has a single shape to render. Submitted ones come first
 * — they are the newest — and anything not yet approved is simply absent,
 * because the RLS policy only exposes `status = 'approved'` and this query
 * asks for it explicitly as well.
 *
 * Falls back to the built-in list if the reviews table does not exist yet, so
 * the page cannot break before migration 0008 is applied.
 */
export const getApprovedTestimonials = cache(async (): Promise<Testimonial[]> => {
  if (!hasAdminCredentials()) return TESTIMONIALS

  try {
    const db = createAdminClient()
    const { data, error } = await db
      .from('reviews')
      .select('*')
      .eq('status', 'approved')
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      if (!/does not exist|schema cache/i.test(error.message)) {
        console.error('[reviews] read failed:', error.message)
      }
      return TESTIMONIALS
    }

    const submitted: Testimonial[] = (data as ReviewRow[]).map((r) => ({
      topic: r.topic?.trim() || 'Tuition',
      quote: r.quote,
      author: r.author_name,
      feature: r.featured,
    }))

    return [...submitted, ...TESTIMONIALS]
  } catch {
    return TESTIMONIALS
  }
})

/** Year groups and stages offered as review headings, so they stay consistent. */
export const REVIEW_TOPICS = [
  'Reception',
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
  'Year 5',
  'Year 6',
  '11+',
  'Phonics',
  'Home education',
] as const
