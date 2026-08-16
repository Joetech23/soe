'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

/**
 * Basket for digital goods.
 *
 * Quantity is always 1 — you cannot own two copies of the same PDF — so the
 * cart is really a set, deduped by product id. Prices held here are for DISPLAY
 * ONLY; the server re-resolves every price from the database at checkout, so
 * tampering with localStorage achieves nothing.
 */
export type CartLine = {
  id: string
  slug: string
  name: string
  pricePence: number
}

type CartState = {
  items: CartLine[]
  add: (line: CartLine) => void
  remove: (id: string) => void
  clear: () => void
  has: (id: string) => boolean
  count: number
  subtotalPence: number
  allFree: boolean
  ready: boolean
}

const KEY = 'soe.cart.v1'
const CartContext = createContext<CartState | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setItems(parsed.filter((x) => x?.id && x?.slug))
      }
    } catch {
      /* corrupted storage — start empty rather than crash the page */
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(KEY, JSON.stringify(items))
    } catch {
      /* private mode / quota — the cart just won't persist */
    }
  }, [items, ready])

  const add = useCallback((line: CartLine) => {
    setItems((cur) => (cur.some((i) => i.id === line.id) ? cur : [...cur, line]))
  }, [])
  const remove = useCallback((id: string) => {
    setItems((cur) => cur.filter((i) => i.id !== id))
  }, [])
  const clear = useCallback(() => setItems([]), [])

  const value = useMemo<CartState>(() => {
    const subtotalPence = items.reduce((s, i) => s + i.pricePence, 0)
    return {
      items,
      add,
      remove,
      clear,
      has: (id: string) => items.some((i) => i.id === id),
      count: items.length,
      subtotalPence,
      allFree: items.length > 0 && subtotalPence === 0,
      ready,
    }
  }, [items, add, remove, clear, ready])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartState {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
