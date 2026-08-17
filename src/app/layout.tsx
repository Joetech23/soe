import type { Metadata } from 'next'
import { League_Spartan, Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import { site } from '@/lib/site'
import { siteUrl } from '@/lib/utils'

/**
 * Display: League Spartan — a geometric sans with tight, confident caps that
 * matches the weight of Ms Betty's own promotional graphics.
 * Body: Plus Jakarta Sans — geometric, friendly and highly legible at small
 * sizes, which is what a parent skim-reading on a phone actually needs.
 */
const display = League_Spartan({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
})

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: site.meta.title,
    template: `%s · ${site.shortName}`,
  },
  description: site.meta.description,
  authors: [{ name: site.owner }],
  openGraph: {
    siteName: site.name,
    title: site.meta.title,
    description: site.meta.description,
    type: 'website',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: site.meta.title,
    description: site.meta.description,
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-sans)',
              borderRadius: '1rem',
            },
          }}
        />
      </body>
    </html>
  )
}
