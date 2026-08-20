import 'server-only'
import { cache } from 'react'
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin'

export type GroupSeats = {
  id: string
  name: string
  description: string | null
  isOneToOne: boolean
  capacity: number | null
  taken: number
  /** null when there is no limit. */
  seatsLeft: number | null
  full: boolean
}

/**
 * Groups with how many places are left.
 *
 * Counted from the register rather than stored as a running total: a stored
 * count drifts the moment a child is moved or removed, and "how many children
 * are in this group" is cheap to ask directly.
 */
export const getGroupsWithSeats = cache(async (): Promise<GroupSeats[]> => {
  if (!hasAdminCredentials()) return []
  const db = createAdminClient()

  const [{ data: groups, error }, { data: kids }] = await Promise.all([
    db.from('groups').select('*').order('name'),
    db.from('children').select('id, group_id'),
  ])
  if (error) {
    console.error('[groups] read failed:', error.message)
    return []
  }

  const counts = new Map<string, number>()
  for (const k of (kids ?? []) as { group_id: string | null }[]) {
    if (k.group_id) counts.set(k.group_id, (counts.get(k.group_id) ?? 0) + 1)
  }

  return ((groups ?? []) as {
    id: string
    name: string
    description: string | null
    is_one_to_one: boolean
    capacity?: number | null
  }[]).map((g) => {
    const taken = counts.get(g.id) ?? 0
    // `capacity` may be absent until migration 0008 is applied; treat that as
    // "no limit" rather than letting the booking page fall over.
    const capacity = typeof g.capacity === 'number' ? g.capacity : null
    const seatsLeft = capacity === null ? null : Math.max(capacity - taken, 0)
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      isOneToOne: g.is_one_to_one,
      capacity,
      taken,
      seatsLeft,
      full: seatsLeft !== null && seatsLeft <= 0,
    }
  })
})
