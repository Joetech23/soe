import { site, YEAR_GROUPS, FAQS } from '@/lib/site'
import { siteUrl } from '@/lib/utils'

/**
 * Structured data, in one place.
 *
 * Everything shares a small set of stable @ids — `#business`, `#website`,
 * `#person` — so Google reads one connected graph rather than several
 * unrelated islands. Pages reference those ids instead of repeating the
 * details, which is also how the facts stay consistent when Ms Betty edits
 * site.ts.
 *
 * Nothing here asserts anything the page does not actually say: no invented
 * ratings, no opening hours we do not publish, no fake address.
 */

const BUSINESS_ID = siteUrl('/#business')
const WEBSITE_ID = siteUrl('/#website')
const PERSON_ID = siteUrl('/#person')

/** Ms Betty herself — she is the thing people search for by name. */
export function personSchema() {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: site.owner,
    jobTitle: 'Primary school tutor',
    worksFor: { '@id': BUSINESS_ID },
    url: siteUrl('/about'),
    image: siteUrl('/images/betty-portrait.jpg'),
  }
}

/**
 * The tutoring business.
 *
 * `EducationalOrganization` rather than a generic LocalBusiness: it is the
 * type that actually describes what this is, and it is what Google's
 * education-related features look for. No `address` is emitted because tuition
 * is online — claiming a shopfront that does not exist would be worse than
 * omitting it.
 */
export function businessSchema() {
  return {
    '@type': ['EducationalOrganization', 'LocalBusiness'],
    '@id': BUSINESS_ID,
    name: site.name,
    alternateName: site.shortName,
    description: site.meta.description,
    slogan: site.tagline,
    url: siteUrl('/'),
    logo: siteUrl('/logo.png'),
    image: siteUrl('/opengraph-image'),
    email: site.contact.email,
    telephone: site.contact.whatsapp,
    founder: { '@id': PERSON_ID },
    areaServed: { '@type': 'Country', name: 'United Kingdom' },
    availableLanguage: 'en-GB',
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'parent',
    },
  }
}

/** The site itself, so Google can attribute sitelinks correctly. */
export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: siteUrl('/'),
    name: site.name,
    description: site.meta.description,
    publisher: { '@id': BUSINESS_ID },
    inLanguage: 'en-GB',
  }
}

/**
 * One `Course` per year group.
 *
 * `hasCourseInstance` is required for Google to treat a Course as eligible —
 * a Course without it is routinely ignored. Mode is online because that is
 * what these are.
 */
export function coursesSchema() {
  return YEAR_GROUPS.map((y) => ({
    '@type': 'Course',
    name: `${y.title} tuition`,
    description: y.blurb ?? `${y.title} tuition with ${site.owner}.`,
    url: siteUrl('/services'),
    provider: { '@id': BUSINESS_ID },
    inLanguage: 'en-GB',
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: 'PT45M',
    },
  }))
}

/** Breadcrumbs. Google shows these in place of a bare URL in results. */
export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...trail].map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: siteUrl(c.path),
    })),
  }
}

/** FAQPage, built from the same FAQs the page renders. */
export function faqSchema() {
  return {
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

/** Wraps nodes into a single @graph — one script tag, one connected graph. */
export function graph(...nodes: object[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.flat(),
  }
}
