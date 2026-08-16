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

export async function redeemInviteCode(
  client: unknown,
  code: string
): Promise<string> {
  const { data, error } = await rpcOf(client)('redeem_invite_code', {
    _code: code,
  })
  if (error) throw error as Error
  return data as string
}
