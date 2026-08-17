import { FileText, Paperclip, Users, UserRound } from 'lucide-react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { AdminPageHeader, Card, SectionHead } from '@/components/admin/ui'
import { HomeworkForm, DeleteHomeworkButton } from '@/components/admin/homework-forms'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Homework', robots: { index: false } }

type Group = { id: string; name: string }
type Child = { id: string; name: string; year_group: string | null }
type Item = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  file_path: string | null
  group_id: string | null
  child_id: string | null
  created_at: string
}

export default async function AdminHomework() {
  let groups: Group[] = []
  let children: Child[] = []
  let items: Item[] = []

  if (hasAdminCredentials()) {
    const db = createAdminClient()
    const [g, c, h] = await Promise.all([
      db.from('groups').select('id, name').order('name'),
      db.from('children').select('id, name, year_group').order('name'),
      db
        .from('homework_items')
        .select('id, title, description, due_date, file_path, group_id, child_id, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    groups = (g.data ?? []) as Group[]
    children = (c.data ?? []) as Child[]
    items = (h.data ?? []) as Item[]
  }

  const groupName = (id: string | null) => groups.find((x) => x.id === id)?.name
  const childName = (id: string | null) => children.find((x) => x.id === id)?.name

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Homework"
        subtitle="Post work to a whole group or a single child. It appears instantly in the parent portal."
      />

      {children.length === 0 && (
        <div className="rounded-card border border-warn/30 bg-warn-tint/50 px-5 py-4 text-sm">
          <strong className="font-bold text-ink">No children added yet.</strong>{' '}
          <span className="text-ink-soft">
            Add children and issue invite codes first — then their parents can sign
            in and see anything you post here.
          </span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <SectionHead title="Post new homework" />
          <div className="p-5">
            <HomeworkForm groups={groups} children={children} />
          </div>
        </Card>

        <Card>
          <SectionHead title={`Posted (${items.length})`} />
          {items.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-muted">
              Nothing posted yet.
            </p>
          ) : (
            <ul className="max-h-[34rem] divide-y divide-line overflow-y-auto">
              {items.map((it) => (
                <li key={it.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="tile h-9 w-9 shrink-0 bg-tile-sky text-teal">
                    <FileText className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink">{it.title}</div>
                    {it.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">
                        {it.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.7rem]">
                      {it.group_id ? (
                        <span className="pill bg-teal-tint text-teal-deep">
                          <Users className="mr-1 h-3 w-3" aria-hidden />
                          {groupName(it.group_id) ?? 'Group'}
                        </span>
                      ) : (
                        <span className="pill bg-tile-rose text-coral">
                          <UserRound className="mr-1 h-3 w-3" aria-hidden />
                          {childName(it.child_id) ?? 'Child'}
                        </span>
                      )}
                      {it.file_path && (
                        <span className="pill bg-surface-sunk text-ink-muted">
                          <Paperclip className="mr-1 h-3 w-3" aria-hidden />
                          Attachment
                        </span>
                      )}
                      {it.due_date && (
                        <span className="font-semibold text-coral">
                          Due{' '}
                          {new Date(it.due_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <DeleteHomeworkButton id={it.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
