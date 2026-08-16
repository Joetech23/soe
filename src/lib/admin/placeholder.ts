/**
 * PLACEHOLDER admin data — for building and previewing the dashboard UI ahead
 * of the live database. Every function here is replaced by a Supabase query
 * (Phase 6 wiring) once migrations are applied. Numbers are illustrative.
 */
import { PRODUCTS } from '@/lib/products'

export type OrderStatus = 'paid' | 'pending_payment' | 'refunded' | 'free'

export type AdminOrder = {
  reference: string
  customerName: string
  customerEmail: string
  itemCount: number
  totalPence: number
  status: OrderStatus
  createdAt: string // ISO
}

export const placeholderStats = {
  revenuePence: 4285,
  revenueTrend: 12, // % vs last month
  orders: 37,
  ordersTrend: 8,
  downloads: 214,
  downloadsTrend: 23,
  subscribers: 96,
  subscribersTrend: 15,
}

export const placeholderOrders: AdminOrder[] = [
  { reference: 'SOE-7K2QP', customerName: 'Amara Okoye', customerEmail: 'amara.o@gmail.com', itemCount: 2, totalPence: 350, status: 'paid', createdAt: '2026-08-06T09:14:00Z' },
  { reference: 'SOE-M4W8X', customerName: 'Daniel Price', customerEmail: 'dprice@outlook.com', itemCount: 1, totalPence: 500, status: 'paid', createdAt: '2026-08-05T18:40:00Z' },
  { reference: 'SOE-P9ZK3', customerName: 'Priya Shah', customerEmail: 'priya.shah@gmail.com', itemCount: 1, totalPence: 0, status: 'free', createdAt: '2026-08-05T11:02:00Z' },
  { reference: 'SOE-B6TN2', customerName: 'Sarah Wells', customerEmail: 'sarahw@icloud.com', itemCount: 3, totalPence: 450, status: 'paid', createdAt: '2026-08-04T20:15:00Z' },
  { reference: 'SOE-3XR7L', customerName: 'James Turner', customerEmail: 'jturner88@gmail.com', itemCount: 1, totalPence: 250, status: 'pending_payment', createdAt: '2026-08-04T08:33:00Z' },
  { reference: 'SOE-Q8FD5', customerName: 'Nadia Haq', customerEmail: 'nadia.haq@gmail.com', itemCount: 1, totalPence: 100, status: 'refunded', createdAt: '2026-08-03T14:50:00Z' },
  { reference: 'SOE-V2HM9', customerName: 'Tom Fielding', customerEmail: 'tfielding@gmail.com', itemCount: 2, totalPence: 600, status: 'paid', createdAt: '2026-08-02T16:20:00Z' },
]

export type AdminCustomer = {
  name: string
  email: string
  orders: number
  spentPence: number
  lastSeen: string
  marketing: boolean
}

export const placeholderCustomers: AdminCustomer[] = [
  { name: 'Amara Okoye', email: 'amara.o@gmail.com', orders: 4, spentPence: 1150, lastSeen: '2026-08-06T09:14:00Z', marketing: true },
  { name: 'Daniel Price', email: 'dprice@outlook.com', orders: 2, spentPence: 750, lastSeen: '2026-08-05T18:40:00Z', marketing: true },
  { name: 'Priya Shah', email: 'priya.shah@gmail.com', orders: 1, spentPence: 0, lastSeen: '2026-08-05T11:02:00Z', marketing: false },
  { name: 'Sarah Wells', email: 'sarahw@icloud.com', orders: 3, spentPence: 900, lastSeen: '2026-08-04T20:15:00Z', marketing: true },
  { name: 'James Turner', email: 'jturner88@gmail.com', orders: 1, spentPence: 250, lastSeen: '2026-08-04T08:33:00Z', marketing: false },
]

/** Product rows with illustrative sales counts layered on the real catalogue. */
export const placeholderProducts = PRODUCTS.map((p, i) => ({
  ...p,
  sales: [42, 31, 28, 24, 19, 15, 12, 9][i] ?? 5,
  active: true,
}))

export const placeholderTopProducts = [...placeholderProducts]
  .sort((a, b) => b.sales - a.sales)
  .slice(0, 4)
