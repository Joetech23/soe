import { GraduationCap, FileText, MessageSquare, Ticket, Download } from 'lucide-react'
import { getMyChildren } from '@/lib/account'
import { site, whatsappHref } from '@/lib/site'
import { RedeemInvite } from '@/components/account/redeem-invite'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'My child', robots: { index: false } }

export default async function ChildPage() {
  const children = await getMyChildren()

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <div className="card p-10 text-center">
          <span className="tile mx-auto mb-4 h-12 w-12 bg-tile-amber text-gold-deep">
            <Ticket className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="font-display text-xl font-bold text-ink">
            No child linked yet
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            If your child has lessons with {site.owner}, she&rsquo;ll give you an
            invite code. Enter it below to see their homework and lesson feedback.
          </p>
          <div className="mx-auto mt-6 max-w-xs">
            <RedeemInvite />
          </div>
          <p className="mt-6 text-xs text-ink-muted">
            Don&rsquo;t have a code?{' '}
            <a href={whatsappHref} className="font-semibold text-coral hover:underline">
              WhatsApp {site.owner}
            </a>
            .
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {children.map((child) => (
        <div key={child.id} className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="tile h-12 w-12 bg-tile-sky text-teal">
              <GraduationCap className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">
                {child.name}
              </h1>
              <p className="text-sm text-ink-muted">
                {[child.yearGroup, child.groupName].filter(Boolean).join(' · ') ||
                  'No group assigned yet'}
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Homework */}
            <div className="card">
              <div className="flex items-center gap-2 border-b border-line px-5 py-4">
                <FileText className="h-4 w-4 text-teal" aria-hidden />
                <h2 className="font-display text-lg font-bold text-ink">Homework</h2>
              </div>
              {child.homework.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ink-muted">
                  No homework set yet.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {child.homework.map((h) => (
                    <li key={h.id} className="px-5 py-4">
                      <div className="font-semibold text-ink">{h.title}</div>
                      {h.description && (
                        <p className="mt-1 text-sm text-ink-soft">{h.description}</p>
                      )}
                      {h.lessonSummary && (
                        <div className="mt-2.5 rounded-lg border-l-[3px] border-teal bg-teal-tint/40 px-3 py-2">
                          <div className="text-[0.65rem] font-bold uppercase tracking-wider text-teal-deep">
                            What we covered
                          </div>
                          <p className="mt-0.5 text-sm text-ink-soft">
                            {h.lessonSummary}
                          </p>
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        {h.dueDate && (
                          <span className="text-xs font-semibold text-coral">
                            Due{' '}
                            {new Date(h.dueDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        )}
                        {h.filePath && (
                          <a
                            href={`/api/homework-file?item=${h.id}`}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-pill bg-teal px-3.5 text-xs font-bold text-white transition-colors hover:bg-teal-deep"
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden />
                            Download
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Feedback */}
            <div className="card">
              <div className="flex items-center gap-2 border-b border-line px-5 py-4">
                <MessageSquare className="h-4 w-4 text-teal" aria-hidden />
                <h2 className="font-display text-lg font-bold text-ink">
                  Lesson feedback
                </h2>
              </div>
              {child.feedback.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ink-muted">
                  No notes yet.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {child.feedback.map((f) => (
                    <li key={f.id} className="px-5 py-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-teal">
                        {new Date(f.lessonDate ?? f.createdAt).toLocaleDateString(
                          'en-GB',
                          { day: 'numeric', month: 'long', year: 'numeric' }
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                        {f.note}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
