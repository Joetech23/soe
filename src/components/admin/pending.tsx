import { Database } from 'lucide-react'
import { AdminPageHeader } from './ui'

/**
 * Placeholder for admin sections whose UI is scaffolded but whose data wiring
 * lands once the database is connected (Phase 6). Keeps the nav complete.
 */
export function AdminPending({
  title,
  subtitle,
  note,
}: {
  title: string
  subtitle: string
  note: string
}) {
  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} subtitle={subtitle} />
      <div className="card grid place-items-center px-6 py-16 text-center">
        <span className="tile mb-4 h-14 w-14 bg-teal-tint text-teal">
          <Database className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="font-display text-lg font-semibold text-ink">
          Ready for your data
        </h2>
        <p className="mt-2 max-w-md text-sm text-ink-soft">{note}</p>
      </div>
    </div>
  )
}
