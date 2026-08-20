import { MessageSquareQuote, Clock, CheckCircle2, EyeOff, Star } from 'lucide-react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { AdminPageHeader, Card, SectionHead, StatCard } from '@/components/admin/ui'
import { ReviewActions } from '@/components/admin/review-forms'
import type { ReviewRow } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Reviews', robots: { index: false } }

function when(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function AdminReviews() {
  let rows: ReviewRow[] = []
  let tableMissing = false

  if (hasAdminCredentials()) {
    const { data, error } = await createAdminClient()
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) tableMissing = /does not exist|schema cache/i.test(error.message)
    rows = (data ?? []) as ReviewRow[]
  }

  const pending = rows.filter((r) => r.status === 'pending')
  const approved = rows.filter((r) => r.status === 'approved')
  const rejected = rows.filter((r) => r.status === 'rejected')

  const groups = [
    {
      title: `Waiting for approval (${pending.length})`,
      items: pending,
      empty: 'Nothing waiting. New reviews land here first.',
    },
    {
      title: `Published (${approved.length})`,
      items: approved,
      empty: 'Nothing published yet.',
    },
    {
      title: `Hidden (${rejected.length})`,
      items: rejected,
      empty: 'Nothing hidden.',
    },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reviews"
        subtitle="Parents write these. Nothing reaches the website until you publish it."
      />

      {tableMissing && (
        <div className="rounded-2xl border border-gold/40 bg-tile-amber px-5 py-4 text-sm text-ink-soft">
          <strong className="text-ink">Reviews table not found.</strong> Apply{' '}
          <code className="rounded bg-surface px-1.5 py-0.5 text-xs">
            supabase/migrations/20260820_0008_lifetime_downloads.sql
          </code>{' '}
          and this page will fill in.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Waiting for you"
          value={String(pending.length)}
          icon={Clock}
          tile="bg-tile-amber text-gold-deep"
        />
        <StatCard
          label="On the site"
          value={String(approved.length)}
          icon={CheckCircle2}
          tile="bg-tile-mint text-success"
        />
        <StatCard
          label="Hidden"
          value={String(rejected.length)}
          icon={EyeOff}
          tile="bg-tile-rose text-coral"
        />
      </div>

      {groups.map((group) => (
        <Card key={group.title}>
          <SectionHead title={group.title} />
          {group.items.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">{group.empty}</p>
          ) : (
            <ul className="divide-y divide-line">
              {group.items.map((r) => (
                <li key={r.id} className="px-5 py-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="tile h-8 w-8 shrink-0 bg-tile-violet text-ink-soft">
                      <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="font-semibold text-ink">{r.author_name}</span>
                    {r.topic && (
                      <span className="rounded-pill bg-teal-tint px-2 py-0.5 text-[0.65rem] font-bold text-teal-deep">
                        {r.topic}
                      </span>
                    )}
                    <span
                      className="flex items-center gap-0.5"
                      aria-label={`${r.rating} out of 5`}
                    >
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-gold text-gold" aria-hidden />
                      ))}
                    </span>
                    <span className="ml-auto text-xs text-ink-muted">
                      {when(r.created_at)}
                    </span>
                  </div>

                  <blockquote className="mb-3 border-l-2 border-line pl-3 text-sm leading-relaxed text-ink-soft">
                    {r.quote}
                  </blockquote>

                  {r.author_email && (
                    <p className="mb-3 text-xs text-ink-muted">
                      Contact:{' '}
                      <a
                        href={`mailto:${r.author_email}`}
                        className="text-teal hover:text-coral"
                      >
                        {r.author_email}
                      </a>
                    </p>
                  )}

                  <ReviewActions id={r.id} status={r.status} featured={r.featured} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  )
}
