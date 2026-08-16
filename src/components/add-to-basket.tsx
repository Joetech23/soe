'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Check } from 'lucide-react'
import { useCart, type CartLine } from '@/lib/cart-context'

export function AddToBasket({ line }: { line: CartLine }) {
  const { add, has, ready } = useCart()
  const [justAdded, setJustAdded] = useState(false)
  const inCart = ready && has(line.id)

  if (inCart) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="btn bg-success-tint text-success">
          <Check className="h-4 w-4" /> In your basket
        </span>
        <Link href="/checkout" className="btn-primary">
          Checkout
        </Link>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        add(line)
        setJustAdded(true)
        setTimeout(() => setJustAdded(false), 1200)
      }}
      className="btn-primary"
      disabled={!ready}
    >
      <ShoppingBag className="h-4 w-4" />
      {justAdded ? 'Added!' : 'Add to basket'}
    </button>
  )
}

/** Small basket indicator for the header. */
export function BasketBadge() {
  const { count, ready } = useCart()
  if (!ready || count === 0) return null
  return (
    <Link
      href="/checkout"
      className="relative grid h-11 w-11 place-items-center rounded-2xl text-ink transition-colors hover:bg-teal-tint"
      aria-label={`Basket, ${count} item${count === 1 ? '' : 's'}`}
    >
      <ShoppingBag className="h-5 w-5" />
      <span className="absolute right-1 top-1 grid h-4.5 min-w-[1.125rem] place-items-center rounded-full bg-coral px-1 text-[0.65rem] font-bold text-white">
        {count}
      </span>
    </Link>
  )
}
