import { FolderTree } from 'lucide-react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { AdminPageHeader, Card, SectionHead } from '@/components/admin/ui'
import { CategoryForm, DeleteCategoryButton } from '@/components/admin/category-forms'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Categories', robots: { index: false } }

type Cat = {
  id: string
  slug: string
  name: string
  summary: string | null
  active: boolean
  sort_order: number
}

export default async function AdminCategories() {
  let cats: Cat[] = []
  const counts = new Map<string, number>()

  if (hasAdminCredentials()) {
    const db = createAdminClient()
    const [c, p] = await Promise.all([
      db
        .from('product_categories')
        .select('id, slug, name, summary, active, sort_order')
        .order('sort_order'),
      db.from('products').select('category_id'),
    ])
    cats = (c.data ?? []) as Cat[]
    for (const row of (p.data ?? []) as { category_id: string | null }[]) {
      if (row.category_id)
        counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1)
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Categories"
        subtitle="How resources are grouped on the Resources page."
      />

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <Card>
          <SectionHead title="Add a category" />
          <div className="p-5">
            <CategoryForm />
          </div>
        </Card>

        <Card>
          <SectionHead
            title={`Categories (${cats.length})`}
            href="/resources"
            linkLabel="View live"
          />
          {cats.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-muted">
              No categories yet.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {cats.map((c) => (
                <li key={c.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="tile h-10 w-10 shrink-0 bg-tile-violet text-ink-soft">
                    <FolderTree className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{c.name}</span>
                      <span className="pill bg-surface-sunk text-ink-muted">
                        {counts.get(c.id) ?? 0} resource
                        {(counts.get(c.id) ?? 0) === 1 ? '' : 's'}
                      </span>
                      {!c.active && (
                        <span className="pill bg-warn-tint text-warn">Hidden</span>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-ink-muted">
                      /{c.slug}
                    </div>
                    {c.summary && (
                      <p className="mt-1 text-xs text-ink-soft">{c.summary}</p>
                    )}
                  </div>
                  <DeleteCategoryButton
                    id={c.id}
                    name={c.name}
                    inUse={(counts.get(c.id) ?? 0) > 0}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
