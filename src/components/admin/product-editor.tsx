'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Save, Upload, X, FileText, Trash2 } from 'lucide-react'
import {
  createProduct,
  updateProduct,
  uploadProductFile,
  deleteProductAsset,
  setProductActive,
  type ActionResult,
} from '@/app/admin/(dash)/products/actions'
import type { ProductRow } from '@/lib/supabase/types'

type Category = { id: string; name: string }
type Asset = { id: string; label: string | null; storage_path: string | null; size_bytes: number | null }

const field =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20'

function handle(res: ActionResult, onDone?: () => void) {
  if (res.ok) {
    toast.success(res.message)
    onDone?.()
  } else {
    toast.error(res.message)
  }
}

/* -------------------------------------------------------------------------- */
/*  Create / edit form                                                        */
/* -------------------------------------------------------------------------- */
export function ProductForm({
  product,
  categories,
  onClose,
}: {
  product?: ProductRow
  categories: Category[]
  onClose: () => void
}) {
  const [pending, start] = useTransition()
  const editing = Boolean(product)

  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = editing ? await updateProduct(fd) : await createProduct(fd)
          handle(res, onClose)
        })
      }
      className="space-y-4"
    >
      {editing && <input type="hidden" name="id" value={product!.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block font-semibold text-ink">Name</span>
          <input name="name" required defaultValue={product?.name} className={field} />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block font-semibold text-ink">
            Web address{' '}
            <span className="font-normal text-ink-muted">
              (leave blank to generate)
            </span>
          </span>
          <input
            name="slug"
            defaultValue={product?.slug}
            placeholder="phonics-handbook"
            className={field}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">Price (pence)</span>
          <input
            name="pricePence"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={product?.price_pence ?? 0}
            className={field}
          />
          <span className="mt-1 block text-xs text-ink-muted">
            0 = free. £2.50 is 250.
          </span>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-ink">Type</span>
          <select
            name="productType"
            defaultValue={product?.product_type ?? 'pdf'}
            className={field}
          >
            <option value="pdf">PDF / printable</option>
            <option value="video">Video / webinar</option>
            <option value="bundle">Bundle</option>
            <option value="external">External link</option>
          </select>
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block font-semibold text-ink">Category</span>
          <select
            name="categoryId"
            defaultValue={product?.category_id ?? ''}
            className={field}
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block font-semibold text-ink">Short summary</span>
          <textarea
            name="summary"
            rows={2}
            defaultValue={product?.summary ?? ''}
            className={field}
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block font-semibold text-ink">
            Full description{' '}
            <span className="font-normal text-ink-muted">(optional)</span>
          </span>
          <textarea
            name="description"
            rows={4}
            defaultValue={product?.description ?? ''}
            className={field}
          />
        </label>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name="active"
          defaultChecked={product?.active ?? true}
          className="h-4 w-4 rounded border-line text-coral focus:ring-coral/40"
        />
        Visible on the website
      </label>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> {editing ? 'Save changes' : 'Create resource'}
            </>
          )}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  )
}

/* -------------------------------------------------------------------------- */
/*  File manager                                                              */
/* -------------------------------------------------------------------------- */
export function AssetManager({
  productId,
  assets,
}: {
  productId: string
  assets: Asset[]
}) {
  const [pending, start] = useTransition()

  return (
    <div className="space-y-3">
      {assets.length > 0 && (
        <ul className="space-y-2">
          {assets.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5"
            >
              <FileText className="h-4 w-4 shrink-0 text-teal" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {a.label ?? a.storage_path?.split('/').pop() ?? 'File'}
              </span>
              {a.size_bytes && (
                <span className="shrink-0 text-xs text-ink-muted">
                  {(a.size_bytes / 1024 / 1024).toFixed(1)} MB
                </span>
              )}
              <button
                type="button"
                aria-label="Remove file"
                onClick={() =>
                  start(async () => handle(await deleteProductAsset(a.id)))
                }
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-coral-tint hover:text-coral"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        action={(fd) => start(async () => handle(await uploadProductFile(fd)))}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-line bg-surface-sunk/40 p-3.5"
      >
        <input type="hidden" name="productId" value={productId} />
        <label className="min-w-[10rem] flex-1 text-sm">
          <span className="mb-1.5 block text-xs font-semibold text-ink">File</span>
          <input
            type="file"
            name="file"
            required
            className="w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-teal file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
          />
        </label>
        <label className="min-w-[8rem] flex-1 text-sm">
          <span className="mb-1.5 block text-xs font-semibold text-ink">
            Label (optional)
          </span>
          <input name="label" placeholder="Workbook (PDF)" className={field} />
        </label>
        <button type="submit" disabled={pending} className="btn-teal px-4 py-2.5 text-sm">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Upload
        </button>
      </form>
      <p className="text-xs text-ink-muted">
        Files go to the private bucket. Customers only ever get a 60-second signed
        link after an entitlement check.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Row actions + drawer                                                      */
/* -------------------------------------------------------------------------- */
export function ProductRowActions({
  product,
  categories,
  assets,
}: {
  product: ProductRow
  categories: Category[]
  assets: Asset[]
}) {
  const [open, setOpen] = useState(false)
  const [, start] = useTransition()

  return (
    <>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-teal hover:bg-teal-tint"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() =>
            start(async () => handle(await setProductActive(product.id, !product.active)))
          }
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-ink-muted hover:bg-surface-sunk"
        >
          {product.active ? 'Hide' : 'Show'}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
          />
          <div className="relative h-full w-full max-w-xl animate-scale-in overflow-y-auto bg-canvas p-6 shadow-pop md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">
                  {product.name}
                </h2>
                <p className="mt-0.5 text-sm text-ink-muted">Edit resource</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl text-ink-muted hover:bg-surface-sunk"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="card p-5">
              <ProductForm
                product={product}
                categories={categories}
                onClose={() => setOpen(false)}
              />
            </div>

            <div className="card mt-5 p-5">
              <h3 className="mb-3 font-display text-lg font-bold text-ink">Files</h3>
              <AssetManager productId={product.id} assets={assets} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function NewProductButton({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary px-4 py-2.5">
        <Plus className="h-4 w-4" /> New product
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
          />
          <div className="relative h-full w-full max-w-xl animate-scale-in overflow-y-auto bg-canvas p-6 shadow-pop md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 className="font-display text-xl font-bold text-ink">New resource</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl text-ink-muted hover:bg-surface-sunk"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="card p-5">
              <ProductForm categories={categories} onClose={() => setOpen(false)} />
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              Create the resource first, then reopen it to upload its file.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
