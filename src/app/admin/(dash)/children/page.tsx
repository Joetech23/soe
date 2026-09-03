import { UserRound, Users, Link2 } from 'lucide-react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { AdminPageHeader, Card, SectionHead } from '@/components/admin/ui'
import {
  ChildForm,
  CopyCode,
  CopyLink,
  FamilyCodeForm,
  NewCodeButton,
  GroupPicker,
  ParentPicker,
  DeleteChildButton,
  type Parent,
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
  child_id: string | null
  used_by: string | null
  used_at: string | null
  /** Every child this code links, resolved from the join table. */
  childIds: string[]
}

export default async function AdminChildren() {
  let groups: Group[] = []
  let children: Child[] = []
  let codes: Code[] = []
  let parents: Parent[] = []

  if (hasAdminCredentials()) {
    const db = createAdminClient()
    const [g, c, ic, icc] = await Promise.all([
      db.from('groups').select('id, name, is_one_to_one').order('name'),
      db
        .from('children')
        .select('id, name, year_group, group_id, parent_user_id, created_at')
        .order('name'),
      db.from('invite_codes').select('id, code, child_id, used_by, used_at'),
      db.from('invite_code_children').select('code_id, child_id'),
    ])

    groups = (g.data ?? []) as Group[]
    children = (c.data ?? []) as Child[]

    // A code's children come from the join table, plus the legacy anchor column
    // for codes minted before migration 0010.
    const links = (icc.data ?? []) as { code_id: string; child_id: string }[]
    codes = ((ic.data ?? []) as Omit<Code, 'childIds'>[]).map((k) => ({
      ...k,
      childIds: [
        ...new Set([
          ...links.filter((l) => l.code_id === k.id).map((l) => l.child_id),
          ...(k.child_id ? [k.child_id] : []),
        ]),
      ],
    }))

    // Parents are the accounts that already hold at least one child. Listing
    // them is what makes adding a sibling a two-click job instead of a
    // second registration.
    const owners = new Set(children.map((k) => k.parent_user_id).filter(Boolean))
    if (owners.size > 0) {
      const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
      parents = (users?.users ?? [])
        .filter((u) => owners.has(u.id))
        .map((u) => ({
          id: u.id,
          email: u.email ?? '(no email)',
          childCount: children.filter((k) => k.parent_user_id === u.id).length,
        }))
        .sort((a, b) => a.email.localeCompare(b.email))
    }
  }

  const nameOf = (id: string) => children.find((c) => c.id === id)?.name ?? 'a child'
  const linked = children.filter((c) => c.parent_user_id).length
  const waiting = children.filter((c) => !c.parent_user_id)
  const families = parents.filter((p) => p.childCount > 1).length

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Children & invite codes"
        subtitle={`${children.length} child${children.length === 1 ? '' : 'ren'} · ${linked} with a parent linked${
          families > 0 ? ` · ${families} parent${families === 1 ? '' : 's'} with siblings` : ''
        }`}
      />

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="space-y-5">
          <Card>
            <SectionHead title="Add a child" />
            <div className="p-5">
              <ChildForm groups={groups} parents={parents} />
            </div>
          </Card>

          <Card>
            <SectionHead title="One code for a family" />
            <FamilyCodeForm children={waiting.map((c) => ({ id: c.id, name: c.name }))} />
          </Card>
        </div>

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
                const mine = codes.filter((k) => k.childIds.includes(child.id))
                const unused = mine.filter((k) => !k.used_by)
                const parent = parents.find((p) => p.id === child.parent_user_id)
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
                            {parent ? (
                              <span className="pill bg-success-tint text-success">
                                <Link2 className="mr-1 h-3 w-3" aria-hidden />
                                {parent.email}
                              </span>
                            ) : (
                              <span className="pill bg-warn-tint text-warn">
                                Awaiting parent
                              </span>
                            )}
                            {parent && parent.childCount > 1 && (
                              <span className="pill bg-tile-sky text-teal-deep">
                                <Users className="mr-1 h-3 w-3" aria-hidden />
                                {parent.childCount} children
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <ParentPicker
                          childId={child.id}
                          parents={parents}
                          current={child.parent_user_id}
                        />
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
                        unused.map((k) => (
                          <span key={k.id} className="inline-flex items-center gap-1">
                            <CopyCode code={k.code} />
                            <CopyLink code={k.code} />
                            {k.childIds.length > 1 && (
                              <span className="text-xs text-ink-muted">
                                covers{' '}
                                {k.childIds
                                  .map(nameOf)
                                  .join(', ')
                                  .replace(/, ([^,]*)$/, ' and $1')}
                              </span>
                            )}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-ink-muted">
                          {mine.length > 0 ? 'All codes used' : 'No active code'}
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
            'Add each child above. A code is created automatically for a new parent.',
            'Got brothers or sisters? Tick them under "One code for a family" so the parent only types one code.',
            'Send the parent the join link — it opens registration with the code already filled in.',
            'Every child on that code appears in their portal, and homework you post is emailed to them.',
            'A sibling starting later needs no code at all: pick the parent from the dropdown when you add the child.',
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
