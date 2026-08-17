import { Users, UserRound } from 'lucide-react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { AdminPageHeader, Card, SectionHead } from '@/components/admin/ui'
import { GroupForm, DeleteGroupButton } from '@/components/admin/children-forms'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Groups', robots: { index: false } }

type Group = {
  id: string
  name: string
  description: string | null
  is_one_to_one: boolean
}
type Child = { id: string; name: string; group_id: string | null }

export default async function AdminGroups() {
  let groups: Group[] = []
  let children: Child[] = []

  if (hasAdminCredentials()) {
    const db = createAdminClient()
    const [g, c] = await Promise.all([
      db.from('groups').select('id, name, description, is_one_to_one').order('name'),
      db.from('children').select('id, name, group_id'),
    ])
    groups = (g.data ?? []) as Group[]
    children = (c.data ?? []) as Child[]
  }

  const unassigned = children.filter((c) => !c.group_id)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Groups & 1:1 slots"
        subtitle="Group your pupils so homework and feedback can go to a whole class at once."
      />

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <Card>
          <SectionHead title="Create a group" />
          <div className="p-5">
            <GroupForm />
          </div>
        </Card>

        <Card>
          <SectionHead title={`Groups (${groups.length})`} />
          {groups.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-muted">
              No groups yet. Name them after the slot — &ldquo;Wednesday 4pm — Year
              1&rdquo; — so they&rsquo;re easy to pick later.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {groups.map((g) => {
                const members = children.filter((c) => c.group_id === g.id)
                return (
                  <li key={g.id} className="flex items-start gap-3 px-5 py-4">
                    <span className="tile h-10 w-10 shrink-0 bg-teal-tint text-teal">
                      {g.is_one_to_one ? (
                        <UserRound className="h-5 w-5" aria-hidden />
                      ) : (
                        <Users className="h-5 w-5" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">{g.name}</span>
                        {g.is_one_to_one && (
                          <span className="pill bg-tile-rose text-coral">1:1</span>
                        )}
                        <span className="pill bg-surface-sunk text-ink-muted">
                          {members.length}{' '}
                          {members.length === 1 ? 'child' : 'children'}
                        </span>
                      </div>
                      {g.description && (
                        <p className="mt-1 text-xs text-ink-soft">{g.description}</p>
                      )}
                      {members.length > 0 && (
                        <p className="mt-1.5 text-xs text-ink-muted">
                          {members.map((m) => m.name).join(' · ')}
                        </p>
                      )}
                    </div>
                    <DeleteGroupButton id={g.id} />
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      {unassigned.length > 0 && (
        <div className="rounded-card border border-warn/30 bg-warn-tint/50 px-5 py-4 text-sm">
          <strong className="font-bold text-ink">
            {unassigned.length} child{unassigned.length === 1 ? '' : 'ren'} not in a
            group:
          </strong>{' '}
          <span className="text-ink-soft">
            {unassigned.map((c) => c.name).join(', ')}. Assign them on the{' '}
            <a href="/admin/children" className="font-semibold text-coral hover:underline">
              Children page
            </a>{' '}
            — they can still get homework individually.
          </span>
        </div>
      )}
    </div>
  )
}
