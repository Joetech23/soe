'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, CornerDownLeft } from 'lucide-react'
import { adminSearch, type SearchHit } from '@/app/admin/(dash)/shell-actions'

/**
 * Topbar search across orders, products, customers, children and enquiries.
 *
 * Debounced, keyboard-first, and it cancels its own stale results: a slow
 * query for "ma" must never overwrite the results for "maths" typed after it,
 * which is the classic way search boxes end up showing the wrong thing.
 */
export function AdminSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const seq = useRef(0)

  /* Cmd/Ctrl+K focuses the box, Escape leaves it. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* Click-away closes the panel. */
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  /* Debounced query. */
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setHits([])
      setBusy(false)
      return
    }
    setBusy(true)
    const mine = ++seq.current
    const t = setTimeout(async () => {
      try {
        const res = await adminSearch(term)
        if (mine !== seq.current) return // a newer keystroke has already won
        setHits(res)
        setActive(0)
        setOpen(true)
      } finally {
        if (mine === seq.current) setBusy(false)
      }
    }, 220)
    return () => clearTimeout(t)
  }, [q])

  function go(hit: SearchHit) {
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
    router.push(hit.href)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || hits.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % hits.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + hits.length) % hits.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = hits[active]
      if (hit) go(hit)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Group while preserving the order the server returned.
  const groups: { name: string; items: SearchHit[] }[] = []
  for (const h of hits) {
    const g = groups.find((x) => x.name === h.group)
    if (g) g.items.push(h)
    else groups.push({ name: h.group, items: [h] })
  }
  let flat = -1

  return (
    <div ref={boxRef} className="relative hidden max-w-md flex-1 sm:block">
      <label className="relative block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls="admin-search-results"
          aria-label="Search orders, products, customers"
          placeholder="Search orders, products, customers…"
          className="w-full rounded-pill border border-line bg-surface py-2 pl-9 pr-16 text-sm text-ink placeholder:text-ink-muted focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-muted" aria-hidden />
          ) : (
            <kbd className="hidden rounded border border-line bg-surface-sunk px-1.5 py-0.5 font-sans text-[0.65rem] font-semibold text-ink-muted md:inline">
              ⌘K
            </kbd>
          )}
        </span>
      </label>

      {open && q.trim().length >= 2 && (
        <div
          id="admin-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-surface shadow-lift"
        >
          {hits.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              {busy ? 'Searching…' : `Nothing found for “${q.trim()}”.`}
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.name} className="border-b border-line last:border-0">
                <div className="px-4 pb-1 pt-3 text-[0.65rem] font-bold uppercase tracking-wider text-ink-muted">
                  {g.name}
                </div>
                {g.items.map((h) => {
                  flat += 1
                  const isActive = flat === active
                  const idx = flat
                  return (
                    <button
                      key={h.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(h)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? 'bg-teal-tint' : 'hover:bg-surface-sunk'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {h.title}
                        </span>
                        <span className="block truncate text-xs text-ink-muted">
                          {h.detail}
                        </span>
                      </span>
                      {isActive && (
                        <CornerDownLeft
                          className="h-3.5 w-3.5 shrink-0 text-teal"
                          aria-hidden
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
