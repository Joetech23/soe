import type { AppRole } from './types'

/**
 * Typed RPC helpers.
 *
 * The `@supabase/ssr` server client collapses its internal Schema generic to
 * `never` against a hand-written `Database` type, so its `.rpc()` is typed to
 * accept no arguments — even though the call is perfectly valid at runtime.
 * These helpers accept the client loosely and re-assert the real `.rpc` shape
 * in one place, exposing a properly typed surface to the rest of the app.
 *
 * Phase 2 regenerates `types.ts` with `supabase gen types typescript`; the cast
 * can be revisited then, but the helpers remain a clean seam either way.
 */
type RpcFn = (
  fn: string,
  args?: Record<string, unknown>
) => PromiseLike<{ data: unknown; error: unknown }>

function rpcOf(client: unknown): RpcFn {
  return (client as { rpc: RpcFn }).rpc.bind(client)
}

export async function hasRole(
  client: unknown,
  userId: string,
  role: AppRole
): Promise<boolean> {
  const { data } = await rpcOf(client)('has_role', {
    _user_id: userId,
    _role: role,
  })
  return data === true
}

/** A child a code linked, so the caller can name them back to the parent. */
export type LinkedChild = { id: string; name: string }

/**
 * Redeem a family invite code.
 *
 * Returns every child on the code that now belongs to the caller — one for a
 * single child, several for a family. Redeeming a code the caller has already
 * used is a no-op that returns the same list, so a parent who taps their link
 * twice sees their children rather than an error.
 */
export async function redeemInviteCode(
  client: unknown,
  code: string
): Promise<LinkedChild[]> {
  const { data, error } = await rpcOf(client)('redeem_invite_code', {
    _code: code,
  })
  if (error) throw error as Error

  // Migration 0010 changed this function's return from a single uuid to a set
  // of rows. Both shapes are accepted so a deploy that lands before the SQL is
  // applied still links the child rather than throwing at the parent.
  if (typeof data === 'string') return [{ id: data, name: 'Your child' }]

  const rows = (data ?? []) as { child_id: string; child_name: string }[]
  return rows.map((r) => ({ id: r.child_id, name: r.child_name }))
}
