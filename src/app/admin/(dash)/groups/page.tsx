import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { AdminPageHeader, Card, SectionHead } from '@/components/admin/ui'
import { GroupForm, GroupRow } from '@/components/admin/children-forms'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Groups', robots: { index: false } }

type Group = {
  id: string
  name: string
  description: string | null
  is_one_to_one: boolean
  /** null = no limit. Absent entirely until migration 0008 is applied. */
  capacity?: number | null
}
type Waiting = { group_id: string }
type Child = { id: string; name: string; group_id: string | null }

export default async function AdminGroups() {
  let groups: Group[] = []
  let children: Child[] = []
  let waiting: Waiting[] = []

  if (hasAdminCredentials()) {
    const db = createAdminClient()
    const [g, c, w] = await Promise.all([
      db.from('groups').select('*').order('name'),
      db.from('children').select('id, name, group_id'),
      // The waitlist table may not exist yet; an error here must not blank the page.
      db.from('waitlist_entries').select('group_id').eq('status', 'waiting'),
    ])
    groups = (g.data ?? []) as Group[]
    children = (c.data ?? []) as Child[]
    waiting = (w.data ?? []) as Waiting[]
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
                  <GroupRow
                    key={g.id}
                    g={{
                      id: g.id,
                      name: g.name,
                      description: g.description,
                      isOneToOne: g.is_one_to_one,
                      capacity: typeof g.capacity === 'number' ? g.capacity : null,
                      memberNames: members.map((m) => m.name),
                      queued: waiting.filter((w) => w.group_id === g.id).length,
                    }}
                  />
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
