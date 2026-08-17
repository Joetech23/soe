import { MessageSquare } from 'lucide-react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { AdminPageHeader, Card, SectionHead } from '@/components/admin/ui'
import { FeedbackForm } from '@/components/admin/homework-forms'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Lesson feedback', robots: { index: false } }

type Child = { id: string; name: string; year_group: string | null }
type Note = {
  id: string
  child_id: string
  note: string
  lesson_date: string | null
  created_at: string
}

export default async function AdminFeedback() {
  let children: Child[] = []
  let notes: Note[] = []

  if (hasAdminCredentials()) {
    const db = createAdminClient()
    const [c, f] = await Promise.all([
      db.from('children').select('id, name, year_group').order('name'),
      db
        .from('feedback_notes')
        .select('id, child_id, note, lesson_date, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    children = (c.data ?? []) as Child[]
    notes = (f.data ?? []) as Note[]
  }

  const childName = (id: string) => children.find((c) => c.id === id)?.name ?? 'Child'

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Lesson feedback"
        subtitle="Share a note after a lesson. Parents see it in their portal straight away."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <SectionHead title="Write feedback" />
          <div className="p-5">
            {children.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">
                Add a child first, then you can send feedback about their lessons.
              </p>
            ) : (
              <FeedbackForm children={children} />
            )}
          </div>
        </Card>

        <Card>
          <SectionHead title={`Sent (${notes.length})`} />
          {notes.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-muted">
              No feedback sent yet.
            </p>
          ) : (
            <ul className="max-h-[34rem] divide-y divide-line overflow-y-auto">
              {notes.map((n) => (
                <li key={n.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="tile h-9 w-9 shrink-0 bg-tile-mint text-success">
                    <MessageSquare className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold text-ink">
                        {childName(n.child_id)}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {new Date(n.lesson_date ?? n.created_at).toLocaleDateString(
                          'en-GB',
                          { day: 'numeric', month: 'short', year: 'numeric' }
                        )}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">
                      {n.note}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
