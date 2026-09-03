'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Ticket } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { redeemInviteCode } from '@/lib/supabase/rpc'

/** "Leo", "Leo and Amara", "Leo, Amara and Sam". */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? 'Your child'
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * Redeem a family invite code.
 *
 * One code can carry several children, so the confirmation names them back —
 * a parent of three needs to see all three landed, not a generic "Linked!".
 *
 * Three ways a code arrives here: typed by hand, prefilled from the join link
 * (`?code=` on the page), or stashed at signup when email confirmation meant it
 * could not be redeemed on the spot.
 */
export function RedeemInvite({ defaultCode = '' }: { defaultCode?: string }) {
  const router = useRouter()
  const [code, setCode] = useState(defaultCode.toUpperCase())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (defaultCode) return
    try {
      const pending = sessionStorage.getItem('soe.pendingInvite')
      if (pending) {
        setCode(pending)
        sessionStorage.removeItem('soe.pendingInvite')
        toast.info('We saved your invite code — tap Link my children to finish.')
      }
    } catch {
      /* private mode */
    }
  }, [defaultCode])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const linked = await redeemInviteCode(supabase, code.trim().toUpperCase())
      const names = linked.map((c) => c.name)
      toast.success(
        names.length > 1
          ? `${listNames(names)} are linked to your account.`
          : `${listNames(names)} is linked to your account.`
      )
      setCode('')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That code did not work.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        required
        placeholder="e.g. LEO-4Q9K"
        aria-label="Invite code"
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-center text-sm uppercase tracking-wider focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
      />
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Linking…
          </>
        ) : (
          <>
            <Ticket className="h-4 w-4" /> Link my children
          </>
        )}
      </button>
    </form>
  )
}
