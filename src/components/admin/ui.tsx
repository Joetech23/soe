import Link from 'next/link'
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/lib/admin/placeholder'

export function AdminPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink md:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  tile,
}: {
  label: string
  value: string
  trend?: number
  icon: LucideIcon
  tile: string
}) {
  const up = (trend ?? 0) >= 0
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-ink-muted">{label}</span>
        <span className={cn('tile h-9 w-9', tile)}>
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </span>
      </div>
      <div className="mt-3 font-display text-3xl font-semibold text-ink">{value}</div>
      {trend !== undefined && (
        <div
          className={cn(
            'mt-1.5 inline-flex items-center gap-1 text-xs font-semibold',
            up ? 'text-success' : 'text-coral-deep'
          )}
        >
          {up ? (
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" aria-hidden />
          )}
          {up ? '+' : ''}
          {trend}% from last month
        </div>
      )}
    </div>
  )
}

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  paid: { label: 'Paid', cls: 'bg-success-tint text-success' },
  free: { label: 'Free', cls: 'bg-teal-tint text-teal-deep' },
  pending_payment: { label: 'Pending', cls: 'bg-warn-tint text-warn' },
  refunded: { label: 'Refunded', cls: 'bg-surface-sunk text-ink-muted' },
}

export function StatusPill({ status }: { status: OrderStatus }) {
  const s = STATUS[status]
  return <span className={cn('pill', s.cls)}>{s.label}</span>
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('card', className)}>{children}</div>
}

export function SectionHead({
  title,
  href,
  linkLabel = 'View all',
}: {
  title: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-line px-5 py-4">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-semibold text-teal hover:text-coral">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}
