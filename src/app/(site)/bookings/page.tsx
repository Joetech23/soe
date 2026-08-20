import type { Metadata } from 'next'
import { Clock, CreditCard, Hourglass } from 'lucide-react'
import { siteUrl } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { Reveal } from '@/components/reveal'
import { BookingForm } from './booking-form'
import { ClassAvailability } from '@/components/class-availability'
import { getGroupsWithSeats } from '@/lib/groups'

export const metadata: Metadata = {
  title: 'Book Tuition',
  description:
    'Book primary tuition or 11+ preparation with Ms Betty, or join the waiting list. Sessions available for Reception through Year 6.',
  alternates: { canonical: siteUrl('/bookings') },
  openGraph: {
    title: 'Book Tuition, Spirit of Excellence Tuition',
    description: 'Book a session with Ms Betty or join the waiting list.',
  },
}

const INFO = [
  {
    icon: Clock,
    tile: 'bg-tile-sky text-teal',
    title: 'Lesson length',
    body: 'Reception 30 mins · Year 1 45 mins · KS2 (Y2–Y6) 50 mins. Age-appropriate so children stay focused and engaged.',
  },
  {
    icon: CreditCard,
    tile: 'bg-tile-rose text-coral',
    title: 'Payment',
    body: "Upfront, monthly in advance. I'll send a secure payment link once we've confirmed your slot.",
  },
  {
    icon: Hourglass,
    tile: 'bg-tile-amber text-gold-deep',
    title: 'Waiting list',
    body: "Popular slots fill up fast, join the waiting list and you'll be first in line the moment something opens up.",
  },
]

export const revalidate = 60

export default async function BookingsPage() {
  // Places left are live, so a class that fills stops being bookable.
  const groups = await getGroupsWithSeats()
  const capped = groups.filter((g) => g.capacity !== null && !g.isOneToOne)

  return (
    <div className="mx-auto max-w-shell px-4 section md:px-8">
      <PageHeader
        eyebrow="Book or join the waiting list"
        title="Let's book your child in."
        lede="Send a quick booking request and Ms Betty will follow up within 48 hours with availability and a secure payment link. If sessions are full for your slot, pop onto the waiting list and I'll email the moment a space opens."
      />

      {capped.length > 0 && (
        <Reveal className="mt-10">
          <h2 className="font-display text-2xl font-bold text-ink">
            Places in this term&rsquo;s classes
          </h2>
          <p className="mb-5 mt-1 text-sm text-ink-soft">
            Updated as children join. Full classes have a waiting list.
          </p>
          <ClassAvailability groups={groups} />
        </Reveal>
      )}

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <div id="booking-form">
            <BookingForm />
          </div>
        </Reveal>

        <aside className="space-y-5">
          {INFO.map((c, i) => (
            <Reveal key={c.title} delay={i * 90}>
              <div className="card card-hover p-5">
                <div className="flex items-center gap-3">
                  <span className={`tile h-10 w-10 ${c.tile}`}>
                    <c.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="font-display text-lg font-semibold text-ink">
                    {c.title}
                  </div>
                </div>
                <p className="mt-2.5 text-sm text-ink-soft">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </aside>
      </div>
    </div>
  )
}
