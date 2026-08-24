import { z } from 'zod'

/** Shared primitives. */
export const email = z.string().trim().email('Please enter a valid email.').max(160)
export const name = z.string().trim().min(2, 'Please share your name.').max(80)
/**
 * Bot honeypot.
 *
 * Accepts ANY string on purpose. A honeypot that fails validation is worse
 * than none: the visitor sees a baffling message about a field they cannot
 * see, and the trap becomes a wall. Previously this was `.max(0)`, which
 * surfaced "String must contain at most 0 character(s)" to real people whose
 * password manager had filled the hidden field.
 *
 * The routes decide what to do with a filled value — silently, and only after
 * everything else has validated.
 */
export const honeypot = z.string().max(200).optional().or(z.literal(''))

export const bookingRequestSchema = z.object({
  parentName: name,
  email,
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  childName: z.string().trim().min(1, "Please share your child's name.").max(80),
  yearGroup: z.string().min(1, 'Please pick a year group.'),
  subject: z.string().min(1, 'Please pick a focus area.'),
  intent: z.enum(['book', 'waitlist']),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  agreeTerms: z.literal(true, {
    errorMap: () => ({
      message: 'Please agree to the terms and conditions to continue.',
    }),
  }),
  hpRef: honeypot,
})
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>

export const newsletterSchema = z.object({
  name,
  email,
  childYear: z.string().trim().max(60).optional().or(z.literal('')),
  hpRef: honeypot,
})
export type NewsletterInput = z.infer<typeof newsletterSchema>

/** Free-download gate (Phase 3). */
export const freeDownloadSchema = z.object({
  email,
  name: z.string().trim().max(80).optional().or(z.literal('')),
  productSlug: z.string().min(1),
  marketingConsent: z.boolean().default(false),
  hpRef: honeypot,
})
export type FreeDownloadInput = z.infer<typeof freeDownloadSchema>
