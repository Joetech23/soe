import { UserRound, Users, Link2 } from 'lucide-react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { AdminPageHeader, Card, SectionHead } from '@/components/admin/ui'
import {
  ChildForm,
  CopyCode,
  NewCodeButton,
  GroupPicker,
  DeleteChildButton,
} from '@/components/admin/children-forms'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Children & invite codes', robots: { index: false } }

type Group = { id: string; name: string; is_one_to_one: boolean }
type Child = {
  id: string
  name: string
  year_group: string | null
  group_id: string | null
  parent_user_id: string | null
  created_at: string
}
type Code = {
  id: string
  code: string
  child_id: string
  used_by: string | null
  used_at: string | null
}

export default async function AdminChildren() {
  let groups: Group[] = []
  let children: Child[] = []
  let codes: Code[] = []

  if (hasAdminCredentials()) {
    const db = createAdminClient()
    const [g, c, ic] = await Promise.all([
      db.from('groups').select('id, name, is_one_to_one').order('name'),
      db
        .from('children')
        .select('id, name, year_group, group_id, parent_user_id, created_at')
        .order('name'),
      db.from('invite_codes').select('id, code, child_id, used_by, used_at'),
    ])
    groups = (g.data ?? []) as Group[]
    children = (c.data ?? []) as Child[]
    codes = (ic.data ?? []) as Code[]
  }

  const linked = children.filter((c) => c.parent_user_id).length

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Children & invite codes"
        subtitle={`${children.length} child${children.length === 1 ? '' : 'ren'} · ${linked} with a parent linked`}
      />

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <Card>
          <SectionHead title="Add a child" />
          <div className="p-5">
            <ChildForm groups={groups} />
          </div>
        </Card>

        <Card>
          <SectionHead title={`On the register (${children.length})`} />
          {children.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-muted">
              No children yet. Add one and you&rsquo;ll get an invite code to send
              their parent.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {children.map((child) => {
                const mine = codes.filter((k) => k.child_id === child.id)
                const unused = mine.filter((k) => !k.used_by)
                return (
                  <li key={child.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="tile h-10 w-10 shrink-0 bg-tile-sky text-teal">
                          <UserRound className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-ink">{child.name}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-ink-muted">
                              {child.year_group ?? 'Year not set'}
                            </span>
                            {child.parent_user_id ? (
                              <span className="pill bg-success-tint text-success">
                                <Link2 className="mr-1 h-3 w-3" aria-hidden />
                                Parent linked
                              </span>
                            ) : (
                              <span className="pill bg-warn-tint text-warn">
                                Awaiting parent
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <GroupPicker
                          childId={child.id}
                          groups={groups}
                          current={child.group_id}
                        />
                        <DeleteChildButton id={child.id} name={child.name} />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 pl-13">
                      {unused.length > 0 ? (
                        unused.map((k) => <CopyCode key={k.id} code={k.code} />)
                      ) : (
                        <span className="text-xs text-ink-muted">
                          {mine.length > 0
                            ? 'All codes used'
                            : 'No active code'}
                        </span>
                      )}
                      <NewCodeButton childId={child.id} childName={child.name} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <SectionHead title="How a parent joins" />
        <ol className="space-y-3 p-5 text-sm text-ink-soft">
          {[
            'Add the child above — a code is created automatically.',
            'Send the parent the code by WhatsApp or email.',
            'They register at /account/register and enter the code.',
            'Their child appears in their portal, and homework you post is emailed to them.',
          ].map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-coral text-xs font-bold text-white">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Card>

      {groups.length === 0 && (
        <div className="rounded-card border border-warn/30 bg-warn-tint/50 px-5 py-4 text-sm">
          <strong className="font-bold text-ink">No groups yet.</strong>{' '}
          <span className="text-ink-soft">
            Create groups on the{' '}
            <a href="/admin/groups" className="font-semibold text-coral hover:underline">
              Groups page
            </a>{' '}
            so you can post homework to a whole class at once.
          </span>
        </div>
      )}
    </div>
  )
}
