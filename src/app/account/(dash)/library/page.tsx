import Link from 'next/link'
import { Download, PlayCircle, Clock, ArrowRight, Library } from 'lucide-react'
import { getLibrary } from '@/lib/account'
import { styleFor } from '@/lib/shop'
import { Icon } from '@/components/icon'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'My library', robots: { index: false } }

export default async function LibraryPage() {
  const items = await getLibrary()

  if (items.length === 0) {
    return (
      <div className="card p-10 text-center">
        <span className="tile mx-auto mb-4 h-12 w-12 bg-teal-tint text-teal">
          <Library className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="font-display text-xl font-bold text-ink">
          Nothing here yet
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
          Anything you download or buy lands here permanently — on any device,
          for as long as you like.
        </p>
        <Link href="/resources" className="btn-primary mt-6">
          Browse resources <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">
          My library
        </h1>
        <p className="mt-1 text-ink-soft">
          {items.length} resource{items.length === 1 ? '' : 's'}, yours to keep.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const s = styleFor(item.product)
          return (
            <div key={item.entitlementId} className="card flex h-full flex-col p-5">
              <div className="flex items-start gap-3">
                <span className={`tile h-12 w-12 shrink-0 ${s.tile}`}>
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-bold leading-snug text-ink">
                    {item.product.name}
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">{item.product.summary}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {item.assets.length === 0 ? (
                  <span className="pill bg-warn-tint text-warn">
                    <Clock className="mr-1 h-3 w-3" aria-hidden /> File coming soon
                  </span>
                ) : (
                  item.assets.map((a) =>
                    a.isFile ? (
                      <a
                        key={a.id}
                        href={`/api/download?asset=${a.id}`}
                        className="btn-primary px-4 py-2.5 text-sm"
                      >
                        <Download className="h-4 w-4" />
                        {a.label ?? 'Download'}
                      </a>
                    ) : (
                      <span
                        key={a.id}
                        className="btn-teal px-4 py-2.5 text-sm opacity-60"
                        title="Streaming lands with the video host"
                      >
                        <PlayCircle className="h-4 w-4" />
                        {a.label ?? 'Watch'}
                      </span>
                    )
                  )
                )}
              </div>

              <p className="mt-3 text-xs text-ink-muted">
                Added{' '}
                {new Date(item.grantedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {item.downloadCount > 0 &&
                  ` · downloaded ${item.downloadCount} time${item.downloadCount === 1 ? '' : 's'}`}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
