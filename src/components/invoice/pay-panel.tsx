'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, CreditCard, ShieldCheck } from 'lucide-react'

/**
 * The pay button for a card or PayPal invoice.
 *
 * The amount is never sent from here — the server reads it from the invoice
 * the token resolves to. This component only says "start it", and follows
 * wherever the provider says to go.
 */
export function PayPanel({
  token,
  method,
  amountLabel,
}: {
  token: string
  method: 'stripe' | 'paypal'
  amountLabel: string
}) {
  const [busy, setBusy] = useState(false)

  async function pay() {
    setBusy(true)
    try {
      const res = await fetch('/api/invoice/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = (await res.json()) as { url?: string; error?: string }

      if (!res.ok || !json.url) {
        toast.error(json.error ?? 'Could not open the payment page.')
        setBusy(false)
        return
      }
      // Deliberately not resetting `busy`: the tab is leaving, and a button
      // that springs back to life mid-navigation invites a double payment.
      window.location.assign(json.url)
    } catch {
      toast.error('Could not reach the payment page. Please check your connection.')
      setBusy(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={pay} disabled={busy} className="btn-primary w-full">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <CreditCard className="h-4 w-4" aria-hidden />
        )}
        Pay {amountLabel} {method === 'paypal' ? 'with PayPal' : 'by card'}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        Payment is handled by {method === 'paypal' ? 'PayPal' : 'Stripe'}. We never see your
        card details.
      </p>
    </div>
  )
}
