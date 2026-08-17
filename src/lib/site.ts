/**
 * Central site config — Ms Betty's content, single source of truth.
 * Copy is ported verbatim from the original site; only defects are corrected
 * (see the plan's "Content fixes" section).
 */
export const site = {
  name: 'Spirit of Excellence Tuition',
  shortName: 'Spirit of Excellence',
  tagline: 'Tuition with Ms Betty',
  mission: 'Cultivating knowledge, understanding and a spirit of excellence.',
  owner: 'Ms Betty',
  contact: {
    // Public-facing address from Ms Betty's own flyers.
    email: 'info@soetuition.com',
    whatsapp: '+447500351139',
    whatsappDisplay: '07500 351139',
    replyTime: '48 hours',
  },
  delivery: 'All sessions are delivered online via Zoom. Times are UK (GMT/BST).',
  hero: {
    name: 'Ms Betty',
    tagline: 'Reception → Year 6 · 11+ prep',
    intro:
      "I help primary school children build the confidence to shine, and I'm right beside their families every step of the way, with warm guidance, honest feedback and a shared sense of celebration for every small win.",
  },
  meta: {
    title: 'Spirit of Excellence Tuition, Primary tutoring with Ms Betty',
    description:
      'Warm, confidence-building primary school tuition from Reception to Year 6, plus 11+ preparation. Cultivating knowledge, understanding and a spirit of excellence.',
  },
} as const

export const whatsappHref = `https://wa.me/${site.contact.whatsapp.replace(/\+/g, '')}`
export const mailHref = `mailto:${site.contact.email}`

// ---------------------------------------------------------------------------
//  Navigation — grouped so the header stays tidy
// ---------------------------------------------------------------------------
export type NavChild = { href: string; label: string; desc: string; icon: string }
export type NavItem =
  | { href: string; label: string; children?: undefined }
  | { label: string; children: NavChild[]; href?: undefined }

export const primaryNav: NavItem[] = [
  { href: '/', label: 'Home' },
  {
    label: 'About',
    children: [
      { href: '/about', label: 'About Ms Betty', desc: 'Meet your tutor', icon: 'Heart' },
      { href: '/how-it-works', label: 'How it works', desc: 'Four simple steps', icon: 'MessageCircle' },
      { href: '/testimonials', label: 'Kind words', desc: 'What families say', icon: 'Quote' },
      { href: '/faq', label: 'FAQ', desc: 'Common questions', icon: 'HelpCircle' },
    ],
  },
  { href: '/services', label: 'Tuition' },
  { href: '/resources', label: 'Resources' },
]

// Flat list, used by the mobile menu.
export const mobileNav = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Ms Betty' },
  { href: '/services', label: 'Tuition' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/resources', label: 'Resources' },
  { href: '/testimonials', label: 'Kind words' },
  { href: '/faq', label: 'FAQ' },
  { href: '/newsletter', label: 'Newsletter' },
] as const

// ---------------------------------------------------------------------------
//  Announcement ticker — every line is factual, drawn from Ms Betty's own copy
// ---------------------------------------------------------------------------
export const TICKER = [
  'Free KS2 inference cards — download today',
  'Reception → Year 6 · 11+ preparation',
  'Small groups from £25 per session',
  'Ms Betty replies within 48 hours',
  'Book Club & Creative Writing now running',
  'Home-ed daytime lessons available',
]

// ---------------------------------------------------------------------------
//  Hero stats. Deliberately factual — no invented student counts.
//    7   = Reception, Y1, Y2, Y3, Y4, Y5, Y6
//    5.0 = every testimonial on file is five stars
//    48  = her stated reply time
//    8   = resources in the hub
// ---------------------------------------------------------------------------
export const HERO_STATS = [
  { value: 7, decimals: 0, suffix: '', label: 'Year groups', note: 'Reception to Year 6' },
  { value: 5, decimals: 1, suffix: '', label: 'Parent rating', note: 'From every review on file' },
  { value: 48, decimals: 0, suffix: 'h', label: 'Reply time', note: 'Or sooner, most days' },
  { value: 8, decimals: 0, suffix: '', label: 'Resources', note: 'Free & premium guides' },
]

// ---------------------------------------------------------------------------
//  Subjects covered (all real, from the services + bookings copy)
// ---------------------------------------------------------------------------
export const SUBJECTS = [
  { name: 'Phonics', note: 'Reception & Year 1', icon: 'Sparkles', tile: 'bg-tile-amber text-gold-deep' },
  { name: 'Maths', note: 'Reception to Year 6', icon: 'Calculator', tile: 'bg-tile-sky text-teal' },
  { name: 'English', note: 'Reading, writing, SPaG', icon: 'BookOpen', tile: 'bg-tile-rose text-coral' },
  { name: '11+ Prep', note: 'English and VR', icon: 'Trophy', tile: 'bg-tile-violet text-ink-soft' },
  { name: 'Creative Writing', note: 'Enrichment club', icon: 'Feather', tile: 'bg-tile-mint text-success' },
  { name: 'Book Club', note: 'Enrichment club', icon: 'Users', tile: 'bg-tile-peach text-coral' },
]

// ---------------------------------------------------------------------------
//  Why families choose Ms Betty (derived from her existing copy)
// ---------------------------------------------------------------------------
export const WHY_US = [
  {
    title: 'Confidence first',
    body: 'Small wins, real praise and gentle challenge, so children believe in themselves before the answers even land.',
    icon: 'Heart',
  },
  {
    title: 'Rooted in the curriculum',
    body: 'Everything maps to the National Curriculum, so tuition supports exactly what is happening at school.',
    icon: 'GraduationCap',
  },
  {
    title: 'One-to-one or small group',
    body: 'Fully personalised 1:1 at £45, or friendly small groups at £25 per child where children learn side by side.',
    icon: 'Users',
  },
  {
    title: 'Progress you can see',
    body: 'Notes, small wins and gentle homework prompts shared by WhatsApp or email, week after week.',
    icon: 'TrendingUp',
  },
  {
    title: 'Home-ed friendly',
    body: 'Flexible weekday daytime sessions for home educating families, shaped around your own rhythm.',
    icon: 'Clock',
  },
  {
    title: 'Resources to keep',
    body: 'A growing library of phonics, reading and parent guides, several of them completely free.',
    icon: 'BookMarked',
  },
]

// ---------------------------------------------------------------------------
//  Year groups & services (from /services)
// ---------------------------------------------------------------------------
export type YearGroup = {
  title: string
  subjects: string
  blurb: string
  icon: string // lucide icon name
  tint: 'coral' | 'teal' | 'gold' | 'pencil'
}

export const YEAR_GROUPS: YearGroup[] = [
  {
    title: 'Reception',
    subjects: 'Maths & English',
    blurb:
      'Early phonics, number sense and letter formation, playful sessions that get little learners ready for school success.',
    icon: 'Sparkles',
    tint: 'gold',
  },
  {
    title: 'Year 1',
    subjects: 'Maths & English',
    blurb:
      'Reading fluency, number bonds and confident sentence writing, building on Reception with gentle challenge.',
    icon: 'BookOpen',
    tint: 'coral',
  },
  {
    title: 'Year 2',
    subjects: 'Maths & English',
    blurb:
      'SATs-ready essentials: comprehension, spelling patterns, place value and calculation strategies.',
    icon: 'Calculator',
    tint: 'teal',
  },
  {
    title: 'Year 3',
    subjects: 'Maths & English',
    blurb:
      'Times tables, fractions and confident written methods, with reading comprehension building alongside.',
    icon: 'Calculator',
    tint: 'teal',
  },
  {
    title: 'Year 4',
    subjects: 'Maths & English',
    blurb:
      'Multiplication facts to 12×12, multi-step problem solving and the writing stamina Year 4 asks for.',
    icon: 'Calculator',
    tint: 'teal',
  },
  {
    title: 'Year 5',
    subjects: 'Maths & English',
    blurb:
      'Consolidating key stage 2 skills and building the reasoning, writing and stamina that set up a strong Year 6 and 11+.',
    icon: 'BookOpen',
    tint: 'coral',
  },
  {
    title: 'Year 6',
    subjects: 'Maths & English',
    blurb:
      'SATs preparation, secondary readiness, grammar deep-dives and reasoning strategies that stick.',
    icon: 'Trophy',
    tint: 'gold',
  },
  {
    title: '11+ Preparation',
    subjects: 'English and VR',
    blurb:
      'Structured 11+ coaching with plenty of exam technique, timed practice, and confidence-building along the way.',
    icon: 'Trophy',
    tint: 'coral',
  },
  {
    title: 'Home Ed Daytime Lessons',
    subjects: 'Any primary year, weekday daytime',
    blurb:
      "Flexible weekday daytime sessions for home educating families, tailored to your child's pace, interests and learning goals.",
    icon: 'Sparkles',
    tint: 'gold',
  },
]

export const ENRICHMENT = [
  {
    title: 'Book Club',
    tagline: 'For readers who want more',
    blurb:
      'A friendly group where children discuss stories, discover new authors, and grow into confident, thoughtful readers.',
    icon: 'Users',
    tint: 'teal' as const,
  },
  {
    title: 'Creative Writing',
    tagline: 'Imagination unlocked',
    blurb:
      'Story starters, poetry, characters and worlds, playful writing sessions that turn reluctant writers into eager ones.',
    icon: 'Feather',
    tint: 'gold' as const,
  },
]

// Prices taken from Ms Betty's current flyers.
export const PRICING = [
  {
    name: 'Weekly group classes',
    price: '£25 per week',
    blurb:
      'After-school Maths and English by year group, on Zoom. Reception English is a shorter session at £23 per week.',
  },
  {
    name: 'Home-ed daytime',
    price: '£8.50 per session',
    blurb:
      'Daytime classes for home educating families — Globe Trotters, History Hunters and Book Clubs.',
  },
  {
    name: 'One-to-one',
    price: '£45 per session',
    blurb:
      "Fully personalised 1:1 tuition, planned around your child's targets, pace and confidence.",
  },
]

// ---------------------------------------------------------------------------
//  Bookings form options
// ---------------------------------------------------------------------------
export const BOOKING_YEAR_GROUPS = [
  'Reception',
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
  'Year 5',
  'Year 6',
  '11+ prep',
  'Home ed (any year)',
]

export const BOOKING_SUBJECTS = [
  '1:1 tuition (£45/session)',
  'Group tuition (£25/session)',
  'Home ed daytime lessons',
  'Maths',
  'English',
  'Maths & English',
  '11+ (English and VR)',
  'Book Club',
  'Creative Writing',
]

// ---------------------------------------------------------------------------
//  How it works (numbered — a real sequence)
// ---------------------------------------------------------------------------
export const STEPS = [
  {
    title: 'Say hello',
    icon: 'MessageCircle',
    body: "Send a booking request or WhatsApp Ms Betty. We'll have a friendly chat about your child, their year group and what you're hoping for.",
  },
  {
    title: 'Book your slot',
    icon: 'CalendarCheck',
    body: 'Once we have agreed on a group for your child, I send a secure payment link. Upfront monthly payment reserves your child’s place.',
  },
  {
    title: 'Start learning',
    icon: 'Sparkles',
    body: "Weekly sessions begin, tailored to your child's pace. Lessons are age-appropriate in length, gently challenging and full of encouragement.",
  },
  {
    title: 'Watch them grow',
    icon: 'TrendingUp',
    body: 'Progress updates and small wins shared via WhatsApp or email. Confidence and curiosity grow week by week.',
  },
]

// ---------------------------------------------------------------------------
//  FAQ (from /faq)
// ---------------------------------------------------------------------------
export const FAQS = [
  {
    q: 'How does payment work?',
    icon: 'CreditCard',
    a: 'Payment is upfront, monthly in advance. Once we confirm a slot, I send a secure payment link. This keeps your child’s place reserved and lets me plan sessions properly.',
  },
  {
    q: 'How long are the lessons?',
    icon: 'Clock',
    a: 'Lesson length is age-appropriate so children stay focused: Reception 30 minutes, Year 1 45 minutes, and KS2 (Years 2–6) 50 minutes.',
  },
  {
    q: 'What should my child bring?',
    icon: 'Pencil',
    a: "A small whiteboard and pen are ideal, or simply paper/notebook and something to write with. I'll share anything additional in advance if a specific session needs it.",
  },
  {
    q: 'What kind of learning space works best?',
    icon: 'Volume2',
    a: 'A quiet, distraction-free space really matters, especially for online sessions. Somewhere your child can sit comfortably, hear clearly and focus without interruptions helps them get the most from every lesson.',
  },
  {
    q: 'How do we stay in touch?',
    icon: 'MessageCircle',
    a: 'Day-to-day communication is via WhatsApp or email. I share progress notes, gentle homework prompts and answer any questions there.',
  },
  {
    q: 'What if we need to cancel or reschedule?',
    icon: 'HelpCircle',
    a: 'Life happens, please let me know as early as you can via WhatsApp or email. Catch up notes and resources will be sent upon request.',
  },
]

// ---------------------------------------------------------------------------
//  Testimonials — REAL reviews, transcribed from Ms Betty's own review cards.
//  These replaced six invented placeholders left over from the original build.
//  `topic` is the heading she used on each card.
// ---------------------------------------------------------------------------
export type Testimonial = {
  topic: string
  quote: string
  author: string
  /** Longer reviews get a wider tile in the masonry grid. */
  feature?: boolean
}

export const TESTIMONIALS: Testimonial[] = [
  {
    topic: 'Easter phonics session',
    quote:
      'Firstly, thank you for the Easter phonics lesson. I’m really pleased with how it went. Since the lesson, she has been eager to show me what she has learned, demonstrating a good understanding of the sounds and how to apply them. It’s been especially encouraging to see her take initiative on her own — I’ve even caught her doing independent work based on the lesson without being prompted. This shows that the learning has really stuck and that she’s developing both confidence and enthusiasm for phonics. I’m very happy with her progress and look forward to seeing her continue to build on these skills.',
    author: 'Reception parent',
    feature: true,
  },
  {
    topic: 'Year 3/4 maths booster',
    quote:
      "I'm so grateful to have crossed paths with Miss Betty. I have watched my child grow in confidence with her maths and show enthusiasm for class. Miss Betty is encouraging, calm and really breaks things down in a way that my child will understand, even if it takes her a while. Miss Betty's patience and passion really shines through. Thank you.",
    author: 'Parent of a Year 3 student',
    feature: true,
  },
  {
    topic: 'Holiday learning',
    quote:
      'What can I say about Ms Betty. My son really enjoys his sessions. I was unsure about enrolling him in the summer programme, however, he did not complain and looked forward to his sessions. His reading and comprehension has come a long way and he is so proud of himself going into year two full of confidence in his abilities. Thank you Ms Betty for your patient, engaging, and encouraging attitude towards learning. We appreciate you.',
    author: 'Parent of a Year 2 student',
    feature: true,
  },
  {
    topic: 'Year 4 learning',
    quote:
      'Miss Betty has tailored her lessons to include Michael Jackson, who my daughter is obsessed with at the moment. She literally counts down the days to see Miss Betty. It’s just a joy to see my daughter find a love for learning.',
    author: 'Parent of a Year 4 student',
  },
  {
    topic: '11+ prep',
    quote:
      'Miss Betty kept my very shy daughter engaged from the very start. She enjoyed the lessons and managed to gain more confidence in her English comprehension than she would have at school.',
    author: 'Parent of a Year 4 student',
  },
  {
    topic: 'Year 6 sessions',
    quote:
      'My daughter has come a long way. She loves her sessions and I’ve seen such an eager energy to learn more. I’m so happy with the sessions.',
    author: 'Parent of a Year 6 student',
  },
  {
    topic: 'Reception phonics',
    quote:
      'Betty speaks softly and she’s very easy to understand. My son always looks forward to the next lesson.',
    author: 'Parent of a Reception student',
  },
]

// ---------------------------------------------------------------------------
//  Terms shown at booking (from /bookings)
// ---------------------------------------------------------------------------
export const BOOKING_TERMS = [
  'Lesson length is age-appropriate: Reception 30 minutes, Year 1 45 minutes, KS2 (Years 2–6) 50 minutes.',
  'Payment is upfront, monthly in advance. A secure payment link is sent once a slot is confirmed.',
  'Please provide a quiet learning space and something to write with (a small whiteboard or notebook works well).',
  'Cancellations and reschedules: let Ms Betty know as early as possible via WhatsApp or email.',
  'Communication happens by WhatsApp or email. Ms Betty responds within 48 hours.',
]
