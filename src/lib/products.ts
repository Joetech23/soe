/**
 * Product catalogue — the digital resources being brought off Payhip.
 *
 * Prices are the LIVE Payhip figures (pence), which is the source of truth.
 * The original website advertised five of these wrongly (three paid items shown
 * as "Free", and two priced too high) — corrected here.
 *
 * Phase 1 renders /resources from this static list. Phase 2 seeds the `products`
 * table from exactly these rows, after which the site reads from the database
 * and this file becomes the seed reference only.
 */
export type ProductCategory = 'Phonics' | 'Reading' | 'KS2' | 'Parents'
export type ProductType = 'pdf' | 'video'

export type Product = {
  slug: string
  name: string
  summary: string
  pricePence: number
  category: ProductCategory
  type: ProductType
  icon: string // lucide icon name
  /** Longer description for the product page (Phase 3). */
  description?: string
}

export const CATEGORIES: ProductCategory[] = ['Phonics', 'Reading', 'KS2', 'Parents']

export const PRODUCTS: Product[] = [
  {
    slug: 'ks2-inference-cards',
    name: 'Free KS2 inference cards',
    summary:
      'Ready-to-print inference cards to sharpen reading comprehension in Key Stage 2.',
    pricePence: 0,
    category: 'KS2',
    type: 'pdf',
    icon: 'BookOpen',
  },
  {
    slug: 'recommended-books',
    name: 'Recommended books',
    summary:
      "Ms Betty's curated reading list of books children love, sorted for every primary age.",
    pricePence: 0,
    category: 'Reading',
    type: 'pdf',
    icon: 'BookMarked',
  },
  {
    slug: 'parents-evening-guide',
    name: 'Parents evening guide',
    summary:
      'Get the most from parents evening, questions to ask and how to act on what you hear.',
    pricePence: 0,
    category: 'Parents',
    type: 'pdf',
    icon: 'Calendar',
  },
  {
    slug: 'expressive-reading-guide',
    name: 'Expressive reading guide for parents',
    summary:
      'How to read aloud with expression at home to build fluency, confidence and a love of stories.',
    pricePence: 100,
    category: 'Reading',
    type: 'pdf',
    icon: 'Mic',
  },
  {
    slug: 'rhyming-bingo',
    name: 'Rhyming bingo',
    summary:
      'A playful rhyming bingo game to build phonological awareness with early readers.',
    pricePence: 100,
    category: 'Phonics',
    type: 'pdf',
    icon: 'Sparkles',
  },
  {
    slug: 'school-readiness-guide',
    name: 'School readiness guide',
    summary:
      'A step-by-step guide to helping your child start school confident, capable and excited.',
    pricePence: 100,
    category: 'Parents',
    type: 'pdf',
    icon: 'GraduationCap',
  },
  {
    slug: 'phonics-handbook',
    name: 'Phonics handbook',
    summary:
      'A friendly handbook for parents that demystifies phonics and shows you how to support at home.',
    pricePence: 250,
    category: 'Phonics',
    type: 'pdf',
    icon: 'Feather',
  },
  {
    slug: 'phonics-webinar',
    name: 'Phonics webinar for parents',
    summary:
      'A recorded webinar walking you through phonics so you can support reading at home with confidence.',
    pricePence: 500,
    category: 'Phonics',
    type: 'video',
    icon: 'Headphones',
  },
]

export const isFree = (p: Product) => p.pricePence === 0
