import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { site, whatsappHref } from '@/lib/site'

export const metadata = {
  title: 'Download link unavailable',
  robots: { index: false },
}

const REASONS: Record<string, { title: string; body: string }> = {
  expired: {
    title: 'This download link has expired',
    body: 'Download links last 30 days. Sign in to your library to get your file again, or ask Ms Betty to send a fresh link.',
  },
  invalid: {
    title: "We couldn't recognise that link",
    body: 'It may have been copied incompletely. Try tapping the button in your email again rather than pasting the address.',
  },
  revoked: {
    title: 'This link is no longer active',
    body: 'If you think that is a mistake, get in touch and Ms Betty will sort it out.',
  },
  noaccess: {
    title: 'This file is not on your account',
    body: 'Make sure you are signed in with the same email you used at checkout.',
  },
  signin: {
    title: 'Please sign in to download',
    body: 'Sign in with the email you used at checkout and your file will be waiting in your library.',
  },
  limit: {
    title: 'Download limit reached',
    body: 'This file has been downloaded the maximum number of times. Get in touch and Ms Betty will help.',
  },
  rate_limit: {
    title: 'Slow down a moment',
    body: 'That file has been downloaded several times in the last hour. Please try again shortly.',
  },
  streamed: {
    title: 'This resource is watched online',
    body: 'The webinar streams from your account rather than downloading. Open it from your library.',
  },
  notfound: {
    title: 'We could not find that file',
    body: 'The resource may have been moved. Browse the resource hub to find it.',
  },
}

const FALLBACK = {
  title: 'That download is unavailable',
  body: 'Something went wrong fetching your file. Please try again, or get in touch and Ms Betty will send it over.',
}

export default function DownloadUnavailable({
  searchParams,
}: {
  searchParams: { reason?: string }
}) {
  const r = REASONS[searchParams.reason ?? ''] ?? FALLBACK

  return (
    <div className="shell flex min-h-[60vh] items-center justify-center py-20">
      <div className="card mx-auto max-w-lg p-8 text-center md:p-10">
        <span className="tile mx-auto mb-5 h-14 w-14 bg-warn-tint text-warn">
          <AlertCircle className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="font-display text-2xl font-bold text-ink">{r.title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-ink-soft">{r.body}</p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/account/library" className="btn-primary">
            Go to my library
          </Link>
          <Link href="/resources" className="btn-secondary">
            Browse resources
          </Link>
        </div>

        <p className="mt-6 text-sm text-ink-muted">
          Still stuck?{' '}
          <a href={whatsappHref} className="font-semibold text-coral hover:underline">
            WhatsApp {site.owner}
          </a>{' '}
          on {site.contact.whatsappDisplay}.
        </p>
      </div>
    </div>
  )
}
