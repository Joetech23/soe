/**
 * Ms Betty's live class timetable, taken from her own promotional flyers.
 *
 * All times are UK (GMT/BST) and every session is delivered on Zoom.
 * Prices: weekly evening classes £25/week (Reception English is £23);
 * home-ed daytime sessions are £8.50 each.
 */
export type ClassSlot = {
  id: string
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'
  start: string
  end: string
  title: string
  detail?: string
  /** Price in pence, per the flyer. */
  pricePence: number
  /** 'weekly' = termly evening classes, 'daytime' = home-ed daytime. */
  track: 'weekly' | 'daytime'
  tint: string
}

export const WEEKLY_PRICE_PENCE = 2500
export const DAYTIME_PRICE_PENCE = 850

export const CLASS_SLOTS: ClassSlot[] = [
  // ── Weekly evening classes — £25/week ─────────────────────────────────────
  {
    id: 'mon-y4',
    day: 'Monday',
    start: '5:00pm',
    end: '5:50pm',
    title: 'Year 4 Maths and English',
    pricePence: 2500,
    track: 'weekly',
    tint: 'bg-tile-rose text-coral',
  },
  {
    id: 'tue-y2',
    day: 'Tuesday',
    start: '4:05pm',
    end: '4:55pm',
    title: 'Year 2 Maths and English',
    pricePence: 2500,
    track: 'weekly',
    tint: 'bg-tile-amber text-gold-deep',
  },
  {
    id: 'tue-reception',
    day: 'Tuesday',
    start: '5:00pm',
    end: '5:30pm',
    title: 'Reception English',
    detail: 'Shorter session, £23 per week',
    pricePence: 2300,
    track: 'weekly',
    tint: 'bg-tile-amber text-gold-deep',
  },
  {
    id: 'tue-y56',
    day: 'Tuesday',
    start: '6:00pm',
    end: '6:50pm',
    title: 'Year 5/6 Maths and English',
    pricePence: 2500,
    track: 'weekly',
    tint: 'bg-tile-amber text-gold-deep',
  },
  {
    id: 'wed-y1',
    day: 'Wednesday',
    start: '4:00pm',
    end: '4:45pm',
    title: 'Year 1 Maths and English',
    pricePence: 2500,
    track: 'weekly',
    tint: 'bg-tile-sky text-teal',
  },
  {
    id: 'fri-y3',
    day: 'Friday',
    start: '5:30pm',
    end: '6:20pm',
    title: 'Year 3 Maths and English',
    pricePence: 2500,
    track: 'weekly',
    tint: 'bg-tile-rose text-coral',
  },

  // ── Home-ed daytime schedule — £8.50/session ──────────────────────────────
  {
    id: 'mon-globe',
    day: 'Monday',
    start: '10:00am',
    end: '10:40am',
    title: 'Globe Trotters',
    detail: 'Geography for ages 7–11',
    pricePence: 850,
    track: 'daytime',
    tint: 'bg-tile-mint text-success',
  },
  {
    id: 'mon-history',
    day: 'Monday',
    start: '11:00am',
    end: '11:40am',
    title: 'History Hunters',
    detail: 'History for ages 7–11',
    pricePence: 850,
    track: 'daytime',
    tint: 'bg-tile-amber text-gold-deep',
  },
  {
    id: 'tue-book68',
    day: 'Tuesday',
    start: '10:00am',
    end: '10:40am',
    title: '6–8 Years Book Club',
    detail: 'Reading & discussion for ages 6–8',
    pricePence: 850,
    track: 'daytime',
    tint: 'bg-tile-violet text-ink-soft',
  },
  {
    id: 'tue-book911',
    day: 'Tuesday',
    start: '11:00am',
    end: '11:40am',
    title: '9–11 Years Book Club',
    detail: 'Reading & discussion for ages 9–11',
    pricePence: 850,
    track: 'daytime',
    tint: 'bg-tile-sky text-teal',
  },
]

export const WEEKLY_CLASSES = CLASS_SLOTS.filter((c) => c.track === 'weekly')
export const DAYTIME_CLASSES = CLASS_SLOTS.filter((c) => c.track === 'daytime')

export const DAYS: ClassSlot['day'][] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
]

/** Options for the booking form's class dropdown. */
export const CLASS_OPTIONS = [
  ...WEEKLY_CLASSES.map(
    (c) => `${c.day} ${c.start} — ${c.title} (£${(c.pricePence / 100).toFixed(2)}/week)`
  ),
  ...DAYTIME_CLASSES.map(
    (c) => `${c.day} ${c.start} — ${c.title} (£8.50/session, home ed)`
  ),
  'One-to-one tuition (£45/session)',
  '11+ preparation',
  'Not sure yet — please advise',
]

/** Price in pence for a one-to-one session, per the booking form's own copy. */
export const ONE_TO_ONE_PRICE_PENCE = 4500

export type SuggestedLine = {
  description: string
  unitPence: number
  /** What one unit buys — drives the default quantity wording on an invoice. */
  unit: 'week' | 'session'
}

/**
 * Turn the class a parent picked on the booking form back into a priced line.
 *
 * The form stores the option label verbatim (`subject` on `booking_requests`),
 * so an exact match against CLASS_OPTIONS is the reliable route. The loose
 * fallback catches labels stored before an option was reworded, which is worth
 * having: a wrong price on screen is obvious, a missing one is just friction.
 *
 * Returns null when the choice genuinely has no price — "11+ preparation" and
 * "Not sure yet" are conversations, not products, and Ms Betty types the figure
 * herself.
 */
export function suggestionForSubject(subject: string | null | undefined): SuggestedLine | null {
  if (!subject) return null
  const s = subject.trim()

  const slot =
    CLASS_SLOTS.find(
      (c) =>
        s === `${c.day} ${c.start} — ${c.title} (£${(c.pricePence / 100).toFixed(2)}/week)` ||
        s === `${c.day} ${c.start} — ${c.title} (£8.50/session, home ed)`
    ) ?? CLASS_SLOTS.find((c) => s.includes(c.title))

  if (slot) {
    return {
      description: `${slot.title} — ${slot.day} ${slot.start}`,
      unitPence: slot.pricePence,
      unit: slot.track === 'weekly' ? 'week' : 'session',
    }
  }

  if (/one-to-one/i.test(s)) {
    return {
      description: 'One-to-one tuition',
      unitPence: ONE_TO_ONE_PRICE_PENCE,
      unit: 'session',
    }
  }

  return null
}
