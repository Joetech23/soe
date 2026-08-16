'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Ticket } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { redeemInviteCode } from '@/lib/supabase/rpc'

/**
 * Redeem an invite code to link a child.
 *
 * Also picks up a code stashed at signup: if email confirmation was on, the
 * code could not be redeemed there and would otherwise have been lost.
 */
export function RedeemInvite() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('soe.pendingInvite')
      if (pending) {
        setCode(pending)
        sessionStorage.removeItem('soe.pendingInvite')
        toast.info('We saved your invite code — tap Link my child to finish.')
      }
    } catch {
      /* private mode */
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      await redeemInviteCode(supabase, code.trim().toUpperCase())
      toast.success('Linked! Your child’s portal is ready.')
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'That code did not work.'
      )
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
            <Ticket className="h-4 w-4" /> Link my child
          </>
        )}
      </button>
    </form>
  )
}
