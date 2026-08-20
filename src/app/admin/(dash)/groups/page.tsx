import { Users, UserRound, Hourglass } from 'lucide-react'
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
                const cap = typeof g.capacity === 'number' ? g.capacity : null
                const full = cap !== null && members.length >= cap
                const queued = waiting.filter((w) => w.group_id === g.id).length
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
                        <span
                          className={`pill ${
                            full
                              ? 'bg-tile-amber text-gold-deep'
                              : 'bg-surface-sunk text-ink-muted'
                          }`}
                        >
                          {cap === null
                            ? `${members.length} ${members.length === 1 ? 'child' : 'children'}`
                            : `${members.length} of ${cap}`}
                        </span>
                        {full && <span className="pill bg-coral-tint text-coral">Full</span>}
                        {queued > 0 && (
                          <span className="pill bg-tile-violet text-ink-soft">
                            <Hourglass className="mr-1 inline h-3 w-3" aria-hidden />
                            {queued} waiting
                          </span>
                        )}
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
