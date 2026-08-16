import Link from 'next/link'
import { Video, Clock, ArrowRight } from 'lucide-react'
import { WEEKLY_CLASSES, DAYTIME_CLASSES, type ClassSlot } from '@/lib/classes'
import { formatPrice } from '@/lib/utils'
import { Reveal } from '@/components/motion'

function groupByDay(slots: ClassSlot[]) {
  const map = new Map<string, ClassSlot[]>()
  for (const s of slots) {
    const list = map.get(s.day) ?? []
    list.push(s)
    map.set(s.day, list)
  }
  return [...map.entries()]
}

function DayColumn({ day, slots }: { day: string; slots: ClassSlot[] }) {
  return (
    <div className="card card-hover flex h-full flex-col overflow-hidden">
      <div className="border-b border-line bg-surface-sunk/60 px-5 py-3">
        <h3 className="font-display text-lg font-bold text-ink">{day}</h3>
      </div>
      <ul className="flex-1 divide-y divide-line">
        {slots.map((s) => (
          <li key={s.id} className="px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-bold text-coral">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {s.start} – {s.end}
            </div>
            <div className="mt-1 font-semibold text-ink">{s.title}</div>
            {s.detail && (
              <div className="mt-0.5 text-sm text-ink-muted">{s.detail}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Timetable() {
  const weekly = groupByDay(WEEKLY_CLASSES)
  const daytime = groupByDay(DAYTIME_CLASSES)

  return (
    <div className="space-y-16">
      {/* Weekly evening classes */}
      <section>
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="badge mb-4">Weekly classes</span>
            <h2 className="font-display text-3xl font-bold text-ink md:text-4xl">
              After-school timetable
            </h2>
            <p className="mt-3 flex items-center gap-2 text-ink-soft">
              <Video className="h-4 w-4 text-teal" aria-hidden />
              Delivered online via Zoom · times are UK (GMT/BST)
            </p>
          </div>
          <div className="rounded-card border border-line bg-surface px-5 py-3 text-center shadow-xs">
            <div className="font-display text-2xl font-bold text-coral">
              {formatPrice(2500)}
            </div>
            <div className="text-xs font-semibold text-ink-muted">per week</div>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {weekly.map(([day, slots], i) => (
            <Reveal key={day} delay={i * 80}>
              <DayColumn day={day} slots={slots} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Home-ed daytime */}
      <section>
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="badge mb-4">Home educated</span>
            <h2 className="font-display text-3xl font-bold text-ink md:text-4xl">
              Daytime schedule
            </h2>
            <p className="mt-3 text-ink-soft">
              Engaging weekly classes for home educated children, on Zoom.
            </p>
          </div>
          <div className="rounded-card border border-line bg-surface px-5 py-3 text-center shadow-xs">
            <div className="font-display text-2xl font-bold text-teal">
              {formatPrice(850)}
            </div>
            <div className="text-xs font-semibold text-ink-muted">per session</div>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {daytime.map(([day, slots], i) => (
            <Reveal key={day} delay={i * 80}>
              <DayColumn day={day} slots={slots} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-8">
          <Link href="/bookings" className="btn-primary">
            Book your spot <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </section>
    </div>
  )
}
