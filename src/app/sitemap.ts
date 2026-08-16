import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/utils'
import { getProducts } from '@/lib/shop'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const pages: Array<{
    path: string
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
    priority: number
  }> = [
    { path: '/', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/services', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/how-it-works', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/resources', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/testimonials', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/faq', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/bookings', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/newsletter', changeFrequency: 'monthly', priority: 0.6 },
  ]

  const products = await getProducts()

  return [
    ...pages.map((p) => ({
      url: siteUrl(p.path),
      lastModified: now,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...products.map((p) => ({
      url: siteUrl(`/resources/${p.slug}`),
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]
}
