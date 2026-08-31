export type WordEntry = {
  word: string
  /**
   * The beats you clap out, checked by hand.
   *
   * Not derived: English syllabification defeats every simple rule — a decent
   * heuristic still gives "Bra-ve", "De-ter-mi-ned", and "Sparkle" as one
   * beat. On a literacy tutor's site that is worse than not showing it at all.
   * The list is curated and finite, so the split is data. Add a word, add its
   * syllables; anything unannotated simply shows whole.
   */
  syllables?: string[]
  partOfSpeech: string
  definition: string
  example: string
}

// A curated list of primary-school-friendly vocabulary words.
// Rotates by day-of-year so every child sees the same word on the same day.
export const WORDS: WordEntry[] = [
  { word: 'Curious', syllables: ['Cu', 'ri', 'ous'], partOfSpeech: 'adjective', definition: 'Wanting to learn or know more about something.', example: 'Maya was curious about how bees make honey.' },
  { word: 'Brave', syllables: ['Brave'], partOfSpeech: 'adjective', definition: 'Showing courage, even when something feels scary.', example: 'It was brave of Tom to read his poem in front of the class.' },
  { word: 'Wander', syllables: ['Wan', 'der'], partOfSpeech: 'verb', definition: 'To walk around slowly without a clear plan.', example: 'We wandered through the park looking for conkers.' },
  { word: 'Gigantic', syllables: ['Gi', 'gan', 'tic'], partOfSpeech: 'adjective', definition: 'Extremely large.', example: 'The dinosaur left a gigantic footprint in the mud.' },
  { word: 'Whisper', syllables: ['Whis', 'per'], partOfSpeech: 'verb', definition: 'To speak very softly, so only nearby people can hear.', example: 'She whispered the secret into her friend’s ear.' },
  { word: 'Journey', syllables: ['Jour', 'ney'], partOfSpeech: 'noun', definition: 'A trip from one place to another, especially a long one.', example: 'Our journey to Grandma’s house took three hours.' },
  { word: 'Fragile', syllables: ['Frag', 'ile'], partOfSpeech: 'adjective', definition: 'Easily broken or damaged.', example: 'Please carry the fragile eggs carefully.' },
  { word: 'Marvellous', syllables: ['Mar', 'vel', 'lous'], partOfSpeech: 'adjective', definition: 'Extremely good or wonderful.', example: 'Ella did a marvellous job on her art project.' },
  { word: 'Discover', syllables: ['Dis', 'cov', 'er'], partOfSpeech: 'verb', definition: 'To find something for the first time.', example: 'Scientists discover new sea creatures every year.' },
  { word: 'Sparkle', syllables: ['Spar', 'kle'], partOfSpeech: 'verb', definition: 'To shine with tiny flashes of light.', example: 'Fresh snow made the garden sparkle.' },
  { word: 'Kindness', syllables: ['Kind', 'ness'], partOfSpeech: 'noun', definition: 'The quality of being friendly, generous and caring.', example: 'A little kindness can make someone’s whole day.' },
  { word: 'Enormous', syllables: ['E', 'nor', 'mous'], partOfSpeech: 'adjective', definition: 'Very, very big.', example: 'An enormous whale swam past the boat.' },
  { word: 'Puzzle', syllables: ['Puz', 'zle'], partOfSpeech: 'noun', definition: 'A problem or game you have to think hard to solve.', example: 'This maths puzzle was tricky but fun.' },
  { word: 'Blossom', syllables: ['Blos', 'som'], partOfSpeech: 'verb', definition: 'To grow, open up, or develop beautifully.', example: 'With practice, her reading really began to blossom.' },
  { word: 'Delightful', syllables: ['De', 'light', 'ful'], partOfSpeech: 'adjective', definition: 'Very pleasing and enjoyable.', example: 'We had a delightful picnic by the river.' },
  { word: 'Explore', syllables: ['Ex', 'plore'], partOfSpeech: 'verb', definition: 'To travel somewhere to learn about it.', example: 'Let’s explore the woods behind the school.' },
  { word: 'Gentle', syllables: ['Gen', 'tle'], partOfSpeech: 'adjective', definition: 'Kind, soft, and careful.', example: 'Be gentle when you stroke the puppy.' },
  { word: 'Imagine', syllables: ['I', 'mag', 'ine'], partOfSpeech: 'verb', definition: 'To picture something in your mind.', example: 'Imagine a world where books could talk.' },
  { word: 'Peculiar', syllables: ['Pe', 'cu', 'liar'], partOfSpeech: 'adjective', definition: 'Strange or unusual.', example: 'The soup had a peculiar taste.' },
  { word: 'Bustling', syllables: ['Bust', 'ling'], partOfSpeech: 'adjective', definition: 'Full of busy activity.', example: 'The market was bustling on Saturday morning.' },
  { word: 'Grateful', syllables: ['Grate', 'ful'], partOfSpeech: 'adjective', definition: 'Feeling thankful for something.', example: 'I am grateful for my kind friends.' },
  { word: 'Adventure', syllables: ['Ad', 'ven', 'ture'], partOfSpeech: 'noun', definition: 'An exciting or unusual experience.', example: 'Our camping trip turned into a real adventure.' },
  { word: 'Whisker', syllables: ['Whis', 'ker'], partOfSpeech: 'noun', definition: 'One of the long, stiff hairs near the mouth of some animals.', example: 'The cat’s whiskers twitched as she sniffed the food.' },
  { word: 'Nibble', syllables: ['Nib', 'ble'], partOfSpeech: 'verb', definition: 'To take small bites of something.', example: 'The rabbit nibbled on a piece of carrot.' },
  { word: 'Twinkle', syllables: ['Twin', 'kle'], partOfSpeech: 'verb', definition: 'To shine with a light that keeps changing from bright to less bright.', example: 'The stars twinkled above the tent.' },
  { word: 'Cheerful', syllables: ['Cheer', 'ful'], partOfSpeech: 'adjective', definition: 'Happy and full of good spirits.', example: 'Ms Betty always gives us a cheerful welcome.' },
  { word: 'Scramble', syllables: ['Scram', 'ble'], partOfSpeech: 'verb', definition: 'To move or climb quickly, often using your hands.', example: 'The children scrambled up the rocks.' },
  { word: 'Wonder', syllables: ['Won', 'der'], partOfSpeech: 'noun', definition: 'A feeling of surprise mixed with admiration.', example: 'She stared at the fireworks in wonder.' },
  { word: 'Muddle', syllables: ['Mud', 'dle'], partOfSpeech: 'noun', definition: 'A confused or messy state.', example: 'My schoolbag is in a real muddle today.' },
  { word: 'Precious', syllables: ['Pre', 'cious'], partOfSpeech: 'adjective', definition: 'Very valuable or greatly loved.', example: 'Family photos are precious to me.' },
  { word: 'Glimmer', syllables: ['Glim', 'mer'], partOfSpeech: 'noun', definition: 'A faint or unsteady light.', example: 'A glimmer of sunlight came through the curtains.' },
  { word: 'Rescue', syllables: ['Res', 'cue'], partOfSpeech: 'verb', definition: 'To save someone or something from danger.', example: 'The firefighters rescued the kitten from the tree.' },
  { word: 'Determined', syllables: ['De', 'ter', 'mined'], partOfSpeech: 'adjective', definition: 'Firmly decided to do something.', example: 'He was determined to learn his times tables.' },
  { word: 'Fantastic', syllables: ['Fan', 'tas', 'tic'], partOfSpeech: 'adjective', definition: 'Extremely good; wonderful.', example: 'You did a fantastic job on your spellings.' },
  { word: 'Scurry', syllables: ['Scur', 'ry'], partOfSpeech: 'verb', definition: 'To move quickly with short, hurried steps.', example: 'Mice scurried across the barn floor.' },
  { word: 'Splendid', syllables: ['Splen', 'did'], partOfSpeech: 'adjective', definition: 'Magnificent; very impressive.', example: 'What a splendid drawing you’ve made!' },
  { word: 'Timid', syllables: ['Tim', 'id'], partOfSpeech: 'adjective', definition: 'Shy and easily frightened.', example: 'The timid deer stayed near the trees.' },
  { word: 'Chatter', syllables: ['Chat', 'ter'], partOfSpeech: 'verb', definition: 'To talk quickly and continuously about unimportant things.', example: 'The friends chattered all the way home.' },
  { word: 'Wobble', syllables: ['Wob', 'ble'], partOfSpeech: 'verb', definition: 'To move unsteadily from side to side.', example: 'The jelly wobbled on the plate.' },
  { word: 'Astonish', syllables: ['As', 'ton', 'ish'], partOfSpeech: 'verb', definition: 'To surprise someone greatly.', example: 'The magician’s trick astonished the whole class.' },
  { word: 'Glisten', syllables: ['Glis', 'ten'], partOfSpeech: 'verb', definition: 'To shine because of being wet or oily.', example: 'Dew glistened on the spider’s web.' },
  { word: 'Delicate', syllables: ['Del', 'i', 'cate'], partOfSpeech: 'adjective', definition: 'Very fine in texture; easily broken.', example: 'Butterflies have delicate wings.' },
]

/**
 * Everything below keys off a plain YYYY-MM-DD date string rather than a Date.
 *
 * Two reasons. A shared link has to show the same word to the person who opens
 * it as it did to the person who sent it, whatever timezone either is in — so
 * "today" is pinned to London, where Ms Betty and her families are. And the
 * page renders on the server for SEO and link previews, which means the server
 * and the browser must agree on the answer without a round trip.
 */

/** Today in London, as YYYY-MM-DD. */
export function londonToday(now: Date = new Date()): string {
  // en-CA gives ISO-shaped output, which saves reassembling the parts.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** True for a well-formed, real calendar date. */
export function isValidDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const d = new Date(`${day}T12:00:00Z`)
  return !Number.isNaN(d.getTime()) && londonFormat(day, { day: 'numeric' }) !== ''
}

/** Days since the epoch — a stable, timezone-free index. */
function dayNumber(day: string): number {
  return Math.floor(Date.parse(`${day}T12:00:00Z`) / 86_400_000)
}

/**
 * The word for a given day. Deterministic: the same date always gives the same
 * word, so a link shared today still makes sense when it is opened tomorrow.
 */
export function getWordForDay(day: string): WordEntry {
  const n = dayNumber(day)
  // Guard against a negative modulo for dates before 1970.
  return WORDS[((n % WORDS.length) + WORDS.length) % WORDS.length]
}

export function getWordOfTheDay(now: Date = new Date()): WordEntry {
  return getWordForDay(londonToday(now))
}

/** Shift a day string by ±n days. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** The seven days ending today, oldest first — the archive strip. */
export function recentDays(today: string, count = 7): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - (count - 1)))
}

/** Format a day string for display, in London. */
export function londonFormat(
  day: string,
  opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }
): string {
  const d = new Date(`${day}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', ...opts }).format(d)
}

/** The beats to clap, or the whole word when it has not been annotated. */
export function splitSyllables(entry: WordEntry): string[] {
  return entry.syllables?.length ? entry.syllables : [entry.word]
}
