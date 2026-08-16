import { formatPrice } from '@/lib/utils'
import { getProductsWithSales } from '@/lib/admin/queries'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { getCategories, styleFor } from '@/lib/shop'
import { AdminPageHeader, Card } from '@/components/admin/ui'
import { Icon } from '@/components/icon'
import { NewProductButton, ProductRowActions } from '@/components/admin/product-editor'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Products', robots: { index: false } }

type Asset = {
  id: string
  product_id: string
  label: string | null
  storage_path: string | null
  size_bytes: number | null
}

export default async function AdminProducts() {
  const [products, categories] = await Promise.all([
    getProductsWithSales(),
    getCategories(),
  ])

  let assets: Asset[] = []
  if (hasAdminCredentials()) {
    const db = createAdminClient()
    const { data } = await db
      .from('product_assets')
      .select('id, product_id, label, storage_path, size_bytes')
    assets = (data ?? []) as Asset[]
  }

  const cats = categories.map((c) => ({ id: c.id, name: c.name }))
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '—'
  const withoutFiles = products.filter(
    (p) => !assets.some((a) => a.product_id === p.id)
  ).length

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Products"
        subtitle={`${products.length} resource${products.length === 1 ? '' : 's'} in your catalogue`}
        action={<NewProductButton categories={cats} />}
      />

      {withoutFiles > 0 && (
        <div className="rounded-card border border-warn/30 bg-warn-tint/50 px-5 py-4 text-sm">
          <strong className="font-bold text-ink">
            {withoutFiles} resource{withoutFiles === 1 ? '' : 's'} still need a file.
          </strong>{' '}
          <span className="text-ink-soft">
            Customers can order them, but they&rsquo;ll see &ldquo;preparing&rdquo;
            until the file is uploaded. Click Edit to add one.
          </span>
        </div>
      )}

      <Card className="overflow-hidden">
        {products.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink-muted">
            No products yet — create your first resource.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">File</th>
                  <th className="px-5 py-3">Sales</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const mine = assets.filter((a) => a.product_id === p.id)
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-line last:border-0 hover:bg-surface-sunk/50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="tile h-10 w-10 shrink-0 bg-teal-tint text-teal">
                            <Icon name={styleFor(p).icon} className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-ink">{p.name}</div>
                            <div className="truncate text-xs text-ink-muted">
                              /{p.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-ink-soft">
                        {catName(p.category_id)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-ink">
                        {p.is_free ? 'Free' : formatPrice(p.price_pence)}
                      </td>
                      <td className="px-5 py-3.5">
                        {mine.length > 0 ? (
                          <span className="pill bg-success-tint text-success">
                            {mine.length} file{mine.length === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="pill bg-warn-tint text-warn">None</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-ink-soft">{p.sales}</td>
                      <td className="px-5 py-3.5">
                        {p.active ? (
                          <span className="pill bg-success-tint text-success">Live</span>
                        ) : (
                          <span className="pill bg-surface-sunk text-ink-muted">
                            Hidden
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <ProductRowActions
                          product={p}
                          categories={cats}
                          assets={mine}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
