'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  Send,
  Check,
  Copy,
  Plus,
  Trash2,
  Ban,
  PhoneCall,
  UserCheck,
  Archive,
} from 'lucide-react'
import {
  setEnquiryStatus,
  saveEnquiryNotes,
  createInvoice,
  sendInvoiceNow,
  markInvoicePaid,
  voidInvoice,
  type ActionResult,
} from '@/app/admin/(dash)/enquiries/actions'
import type { EnquiryStatus, InvoiceMethod } from '@/lib/supabase/types'
import { formatMoney } from '@/lib/utils'

const field =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20'

function handle(res: ActionResult): void {
  if (res.ok) toast.success(res.message)
  else toast.error(res.message)
}

/** Pence from a pounds text input, tolerant of "25", "25.00", "£25". */
function toPence(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '')
  const pounds = Number.parseFloat(cleaned)
  return Number.isFinite(pounds) ? Math.round(pounds * 100) : 0
}

/* -------------------------------------------------------------------------- */
/*  Where this enquiry has got to                                             */
/* -------------------------------------------------------------------------- */

const STEPS: { status: EnquiryStatus; label: string; icon: typeof Check }[] = [
  { status: 'contacted', label: 'Contacted', icon: PhoneCall },
  { status: 'converted', label: 'Booked in', icon: UserCheck },
  { status: 'waitlist', label: 'Waiting list', icon: Loader2 },
  { status: 'closed', label: 'Close', icon: Archive },
]

export function EnquiryStatusActions({
  id,
  status,
}: {
  id: string
  status: EnquiryStatus
}) {
  const [busy, start] = useTransition()

  return (
    <div className="flex flex-wrap gap-1.5">
      {STEPS.filter((s) => s.status !== status).map((s) => (
        <button
          key={s.status}
          type="button"
          disabled={busy}
          onClick={() => start(async () => handle(await setEnquiryStatus(id, s.status)))}
          className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-xs font-bold text-ink-soft transition-colors hover:border-teal hover:text-teal disabled:opacity-50"
        >
          <s.icon className="h-3 w-3" aria-hidden />
          {s.label}
        </button>
      ))}
      {status !== 'new' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => start(async () => handle(await setEnquiryStatus(id, 'new')))}
          className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-bold text-ink-muted hover:bg-surface-sunk disabled:opacity-50"
        >
          Reopen
        </button>
      )}
    </div>
  )
}

export function EnquiryNotes({ id, notes }: { id: string; notes: string | null }) {
  const [value, setValue] = useState(notes ?? '')
  const [busy, start] = useTransition()
  const dirty = value !== (notes ?? '')

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="What you agreed, what to follow up, anything the parent mentioned on the phone."
        className={field}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={() => start(async () => handle(await saveEnquiryNotes(id, value)))}
          className="btn-secondary min-h-0 px-4 py-2 text-xs"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
          Save notes
        </button>
        {dirty && <span className="text-xs text-ink-muted">Unsaved changes</span>}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Raising an invoice                                                        */
/* -------------------------------------------------------------------------- */

type Line = { description: string; quantity: string; unit: string }

export function InvoiceBuilder({
  enquiryId,
  suggestion,
  methods,
  defaultMethod,
  hasBankDetails,
}: {
  enquiryId: string
  /** Priced from the class the parent picked, when we can work it out. */
  suggestion: { description: string; unitPence: number; unit: string } | null
  methods: InvoiceMethod[]
  defaultMethod: InvoiceMethod
  hasBankDetails: boolean
}) {
  const [lines, setLines] = useState<Line[]>([
    suggestion
      ? {
          description: suggestion.description,
          quantity: '1',
          unit: (suggestion.unitPence / 100).toFixed(2),
        }
      : { description: '', quantity: '1', unit: '' },
  ])
  const [method, setMethod] = useState<InvoiceMethod>(defaultMethod)
  const [discount, setDiscount] = useState('')
  const [dueOn, setDueOn] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, start] = useTransition()

  const subtotal = lines.reduce(
    (sum, l) => sum + toPence(l.unit) * Math.max(Number(l.quantity) || 0, 0),
    0
  )
  const total = Math.max(subtotal - toPence(discount), 0)

  function update(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function submit(send: boolean) {
    start(async () => {
      const res = await createInvoice({
        enquiryId,
        lines: lines.map((l) => ({
          description: l.description,
          quantity: Number(l.quantity) || 1,
          unitPence: toPence(l.unit),
        })),
        method,
        discountPence: toPence(discount),
        dueOn: dueOn || null,
        notes: notes || null,
        send,
      })
      handle(res)
      if (res.ok) {
        setNotes('')
        setDiscount('')
      }
    })
  }

  return (
    <div className="space-y-4">
      {suggestion && (
        <p className="rounded-xl bg-teal-tint/60 px-3.5 py-2.5 text-xs text-teal-deep">
          Priced from the class this parent picked — {suggestion.description} at{' '}
          {formatMoney(suggestion.unitPence)} per {suggestion.unit}. Change anything you
          like before sending.
        </p>
      )}

      <div className="space-y-2.5">
        {lines.map((l, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_2rem]">
            <input
              value={l.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="What they are paying for"
              aria-label={`Line ${i + 1} description`}
              className={field}
            />
            <input
              value={l.quantity}
              onChange={(e) => update(i, { quantity: e.target.value })}
              inputMode="numeric"
              aria-label={`Line ${i + 1} quantity`}
              className={field}
            />
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                £
              </span>
              <input
                value={l.unit}
                onChange={(e) => update(i, { unit: e.target.value })}
                inputMode="decimal"
                placeholder="0.00"
                aria-label={`Line ${i + 1} unit price`}
                className={`${field} pl-7`}
              />
            </div>
            <button
              type="button"
              onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
              disabled={lines.length === 1}
              aria-label={`Remove line ${i + 1}`}
              className="grid h-10 w-9 place-items-center rounded-lg text-ink-muted hover:bg-coral-tint hover:text-coral disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            setLines((prev) => [...prev, { description: '', quantity: '1', unit: '' }])
          }
          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:text-coral"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add a line
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-semibold text-ink">
            Discount <span className="font-normal text-ink-muted">(optional)</span>
          </span>
          <input
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className={field}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-semibold text-ink">Due by</span>
          <input
            type="date"
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
            className={field}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-semibold text-ink">
            How they pay
          </span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as InvoiceMethod)}
            className={field}
          >
            {methods.map((m) => (
              <option key={m} value={m}>
                {m === 'custom'
                  ? 'Bank transfer / other'
                  : m === 'stripe'
                    ? 'Card (Stripe)'
                    : 'PayPal'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {method === 'custom' && !hasBankDetails && (
        <p className="rounded-xl bg-warn-tint px-3.5 py-2.5 text-xs text-warn">
          You have not saved your bank details yet, so the invoice will not say how to
          pay. Add them in Settings — you only need to do it once.
        </p>
      )}

      <label className="block text-sm">
        <span className="mb-1.5 block text-xs font-semibold text-ink">
          Note to the parent <span className="font-normal text-ink-muted">(optional)</span>
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="First session starts Friday 12 September."
          className={field}
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="text-sm">
          <span className="text-ink-muted">Total </span>
          <span className="font-display text-xl font-bold text-ink">
            {formatMoney(total)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => submit(false)}
            className="btn-secondary min-h-0 px-4 py-2 text-xs"
          >
            Save as draft
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => submit(true)}
            className="btn-primary min-h-0 px-4 py-2 text-xs"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden />
            )}
            Send invoice
          </button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Acting on an invoice that already exists                                  */
/* -------------------------------------------------------------------------- */

export function InvoiceActions({
  id,
  status,
}: {
  id: string
  status: 'draft' | 'sent' | 'paid' | 'void'
}) {
  const [busy, start] = useTransition()
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied.')
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error('Could not copy — select the link and copy it by hand.')
    }
  }

  if (status === 'void') {
    return <span className="text-xs text-ink-muted">Cancelled</span>
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {status !== 'paid' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                start(async () => {
                  const res = await sendInvoiceNow(id)
                  handle(res)
                  if (res.payUrl) setLink(res.payUrl)
                })
              }
              className="inline-flex items-center gap-1.5 rounded-pill bg-teal px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Send className="h-3 w-3" aria-hidden />
              )}
              {status === 'draft' ? 'Send' : 'Send again'}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const ref = window.prompt(
                  'Any reference for this payment? (e.g. the bank transfer description). Leave blank if there isn’t one.'
                )
                // Cancel on the prompt means cancel, not "mark paid with no note".
                if (ref === null) return
                start(async () => handle(await markInvoicePaid(id, ref)))
              }}
              className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-xs font-bold text-ink-soft transition-colors hover:border-success hover:text-success disabled:opacity-50"
            >
              <Check className="h-3 w-3" aria-hidden /> Mark paid
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!window.confirm('Cancel this invoice? The pay link stops working.')) {
                  return
                }
                start(async () => handle(await voidInvoice(id)))
              }}
              className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-bold text-ink-muted hover:bg-coral-tint hover:text-coral disabled:opacity-50"
            >
              <Ban className="h-3 w-3" aria-hidden /> Cancel
            </button>
          </>
        )}
      </div>

      {link && (
        <div className="flex items-center gap-2 rounded-xl bg-surface-sunk px-3 py-2">
          <code className="min-w-0 flex-1 truncate text-[0.7rem] text-ink-soft">{link}</code>
          <button
            type="button"
            onClick={() => copy(link)}
            className="inline-flex items-center gap-1 text-xs font-bold text-teal hover:text-coral"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}
