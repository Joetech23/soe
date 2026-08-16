import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download, Check, Clock, PlayCircle } from 'lucide-react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'
import { hashToken } from '@/lib/downloads'
import { formatPrice } from '@/lib/utils'
import { site } from '@/lib/site'
import type { OrderRow } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Your files',
  robots: { index: false, follow: false },
}

type AssetLite = {
  id: string
  product_id: string
  label: string | null
  storage_path: string | null
  video_id: string | null
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: { reference: string }
  searchParams: { t?: string }
}) {
  if (!hasAdminCredentials()) notFound()
  const db = createAdminClient()

  const { data: orderData } = await db
    .from('orders')
    .select('*')
    .eq('order_number', params.reference.toUpperCase())
    .maybeSingle()

  if (!orderData) notFound()
  const order = orderData as OrderRow

  // The token proves ownership. Without a valid one we show nothing — this page
  // is reached from an emailed link, so a bare URL must not expose an order.
  const token = searchParams.t
  let authorised = false
  if (token) {
    const { data: tok } = await db
      .from('download_tokens')
      .select('email, expires_at, revoked_at')
      .eq('token_hash', hashToken(token))
      .maybeSingle()
    const t = tok as { email: string; expires_at: string; revoked_at: string | null } | null
    authorised =
      !!t &&
      !t.revoked_at &&
      new Date(t.expires_at) > new Date() &&
      t.email.toLowerCase() === order.customer_email.toLowerCase()
  }

  if (!authorised) {
    return (
      <div className="shell flex min-h-[60vh] items-center justify-center py-20">
        <div className="card mx-auto max-w-lg p-8 text-center md:p-10">
          <span className="tile mx-auto mb-5 h-14 w-14 bg-warn-tint text-warn">
            <Clock className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="font-display text-2xl font-bold text-ink">
            This link needs to come from your email
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-ink-soft">
            Open the link in the email we sent to view your files. If it has
            expired, sign in with the same address and they&rsquo;ll be in your
            library.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/account/library" className="btn-primary">
              Go to my library
            </Link>
            <Link href="/resources" className="btn-secondary">
              Browse resources
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { data: itemsData } = await db
    .from('order_items')
    .select('product_id, product_name, unit_price_pence')
    .eq('order_id', order.id)
  const items = (itemsData ?? []) as {
    product_id: string | null
    product_name: string
    unit_price_pence: number
  }[]

  const { data: assetsData } = await db
    .from('product_assets')
    .select('id, product_id, label, storage_path, video_id')
    .in('product_id', items.map((i) => i.product_id).filter(Boolean) as string[])
  const assets = (assetsData ?? []) as AssetLite[]

  return (
    <div className="shell section">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <span className="tile mx-auto mb-5 h-14 w-14 bg-success-tint text-success">
            <Check className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">
            {order.total_pence === 0 ? 'Here you go!' : 'Thank you!'}
          </h1>
          <p className="mt-3 text-ink-soft">
            {order.total_pence === 0
              ? 'Your resource is ready to download below.'
              : `Order ${order.order_number} is confirmed. Your files are ready.`}
          </p>
        </div>

        <div className="card mt-10 divide-y divide-line">
          {items.map((item) => {
            const itemAssets = assets.filter((a) => a.product_id === item.product_id)
            return (
              <div key={item.product_name} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-display text-lg font-bold text-ink">
                      {item.product_name}
                    </div>
                    <div className="text-sm text-ink-muted">
                      {item.unit_price_pence === 0
                        ? 'Free resource'
                        : formatPrice(item.unit_price_pence)}
                    </div>
                  </div>

                  {itemAssets.length === 0 ? (
                    <span className="pill bg-warn-tint text-warn">Preparing…</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {itemAssets.map((a) =>
                        a.storage_path ? (
                          <a
                            key={a.id}
                            href={`/api/download?asset=${a.id}&t=${encodeURIComponent(token!)}`}
                            className="btn-primary px-4 py-2.5 text-sm"
                          >
                            <Download className="h-4 w-4" />
                            {a.label ?? 'Download'}
                          </a>
                        ) : (
                          <Link
                            key={a.id}
                            href="/account/library"
                            className="btn-teal px-4 py-2.5 text-sm"
                          >
                            <PlayCircle className="h-4 w-4" />
                            Watch
                          </Link>
                        )
                      )}
                    </div>
                  )}
                </div>

                {itemAssets.length === 0 && (
                  <p className="mt-2 text-xs text-ink-muted">
                    {site.owner} is uploading this file. You&rsquo;ll get an email
                    the moment it&rsquo;s ready — your access is already saved.
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 rounded-card border border-line bg-surface-sunk/50 p-5 text-sm text-ink-soft">
          <p className="font-semibold text-ink">Keep these files forever</p>
          <p className="mt-1">
            This link works for 30 days. Create an account with{' '}
            <strong>{order.customer_email}</strong> and everything you&rsquo;ve
            downloaded stays in your library permanently.
          </p>
          <Link href="/account/register" className="btn-secondary mt-4 px-4 py-2.5 text-sm">
            Set up my library
          </Link>
        </div>
      </div>
    </div>
  )
}
