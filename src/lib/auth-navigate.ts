/**
 * Navigate after the signed-in state has changed.
 *
 * `router.push()` followed by `router.refresh()` is the obvious thing to write
 * here and it is subtly wrong. Next keeps a client-side Router Cache of RSC
 * payloads, and the payload for the destination was very likely fetched by a
 * link prefetch while the visitor was still signed OUT. So `push` renders that
 * cached signed-out page, `refresh` then re-fetches in the background, and the
 * page appears to sit there logged out until it catches up — or until the
 * visitor gives up and reloads by hand.
 *
 * A sign-in or sign-out changes an httpOnly cookie that every server component
 * in the tree reads. There is nothing worth preserving on the client at that
 * moment, so a full document navigation is both the correct thing and the fast
 * thing: one request, correct HTML, no stale frame in between.
 *
 * `assign` rather than `replace` so the browser Back button still behaves, and
 * only same-origin paths are accepted so this can never be pointed off-site.
 */
export function navigateAfterAuth(path: string): void {
  const safe = path.startsWith('/') && !path.startsWith('//') ? path : '/account'
  window.location.assign(safe)
}
