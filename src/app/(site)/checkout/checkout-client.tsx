'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2, Lock, Loader2, ShoppingBag, ArrowRight } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { formatPrice } from '@/lib/utils'
import { site } from '@/lib/site'

export function CheckoutClient() {
  const { items, remove, clear, subtotalPence, count, ready } = useCart()
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('name') ?? ''),
          email: String(form.get('email') ?? ''),
          productIds: items.map((i) => i.id),
          digitalConsent: form.get('digitalConsent') === 'on',
          marketingConsent: form.get('marketingConsent') === 'on',
          billingCountry: String(form.get('billingCountry') ?? 'GB'),
          company: String(form.get('company') ?? ''),
        }),
      })
      const body = await res.json().catch(() => ({}))

      if (res.ok && body.redirectUrl) {
        clear()
        router.push(body.redirectUrl)
        return
      }
      throw new Error(body?.error ?? 'Something went wrong.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!ready) {
    return <div className="card h-64 animate-pulse bg-surface-sunk/40" />
  }

  if (count === 0) {
    return (
      <div className="card p-10 text-center">
        <span className="tile mx-auto mb-5 h-14 w-14 bg-surface-sunk text-ink-muted">
          <ShoppingBag className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="font-display text-xl font-bold text-ink">
          Your basket is empty
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-ink-soft">
          Have a browse of Ms Betty&rsquo;s guides and printables — several are
          completely free.
        </p>
        <Link href="/resources" className="btn-primary mt-6">
          Browse resources <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  const allFree = subtotalPence === 0

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
      <form onSubmit={onSubmit} className="card space-y-6 p-6 md:p-8">
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />

        <div>
          <h2 className="font-display text-xl font-bold text-ink">Your details</h2>
          <p className="mt-1 text-sm text-ink-muted">
            We only need these to send your files and receipt.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-ink">
              Your name <span className="text-coral">*</span>
            </span>
            <input
              name="name"
              required
              autoComplete="name"
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-ink">
              Email <span className="text-coral">*</span>
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
            />
            <span className="mt-1 block text-xs text-ink-muted">
              Double-check this — it&rsquo;s where your files go.
            </span>
          </label>
        </div>

        <label className="block max-w-xs text-sm">
          <span className="mb-1.5 block font-semibold text-ink">Billing country</span>
          <select
            name="billingCountry"
            defaultValue="GB"
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
          >
            <option value="GB">United Kingdom</option>
            <option value="IE">Ireland</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
            <option value="NZ">New Zealand</option>
            <option value="ZA">South Africa</option>
            <option value="NG">Nigeria</option>
          </select>
        </label>

        <div className="space-y-3 rounded-2xl border border-line bg-surface-sunk/50 p-4">
          {/* Consumer Contracts Regs 2013 — must be actively ticked, never pre-ticked. */}
          <label className="flex items-start gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              name="digitalConsent"
              required
              className="mt-0.5 h-4 w-4 rounded border-line text-coral focus:ring-coral/40"
            />
            <span>
              I want my files immediately and I understand that once they&rsquo;re
              delivered I lose the 14-day right to cancel.{' '}
              <span className="text-coral">*</span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="marketingConsent"
              className="mt-0.5 h-4 w-4 rounded border-line text-coral focus:ring-coral/40"
            />
            <span>
              Send me Ms Betty&rsquo;s occasional newsletter. Optional —
              unsubscribe any time.
            </span>
          </label>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Working…
            </>
          ) : allFree ? (
            <>Get my files</>
          ) : (
            <>
              <Lock className="h-4 w-4" /> Pay {formatPrice(subtotalPence)}
            </>
          )}
        </button>

        {!allFree && (
          <p className="text-center text-xs text-ink-muted">
            Card payments are being connected. Your order is saved either way and{' '}
            {site.owner} will follow up.
          </p>
        )}
      </form>

      <aside className="card p-6">
        <h2 className="font-display text-lg font-bold text-ink">Your basket</h2>
        <ul className="mt-4 divide-y divide-line">
          {items.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">{i.name}</div>
                <div className="text-xs text-ink-muted">
                  {i.pricePence === 0 ? 'Free' : formatPrice(i.pricePence)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(i.id)}
                aria-label={`Remove ${i.name}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-coral-tint hover:text-coral"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <span className="font-semibold text-ink">Total</span>
          <span className="font-display text-2xl font-bold text-ink">
            {formatPrice(subtotalPence)}
          </span>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          Instant download after checkout, plus a copy emailed to you. Your link
          works for 30 days, and forever if you create an account.
        </p>
      </aside>
    </div>
  )
}
