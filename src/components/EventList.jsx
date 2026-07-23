import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { FESTIVAL_DAYS } from '../data/days'
import { useLang } from '../context/LangContext'
import EventCard from './EventCard'

function groupEventsByDay(events) {
  const order = FESTIVAL_DAYS.map((d) => d.date)
  const buckets = new Map()

  for (const event of events) {
    const key = event.dia || ''
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(event)
  }

  const dates = [...buckets.keys()].sort((a, b) => {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    if (ia === -1 && ib === -1) return String(a).localeCompare(String(b))
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  return dates.map((date) => ({
    date,
    meta: FESTIVAL_DAYS.find((d) => d.date === date) || null,
    events: buckets.get(date),
  }))
}

export default function EventList({
  events,
  loading,
  hasFilter,
  favoritesEmpty,
  placeEmpty,
  highlightId,
  groupByDay = false,
}) {
  const { t } = useLang()

  const groups = useMemo(() => {
    if (!groupByDay || !events.length) return null
    const g = groupEventsByDay(events)
    return g.length > 1 ? g : null
  }, [events, groupByDay])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-barrete/70">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <p className="text-sm font-medium">{t.loading}</p>
      </div>
    )
  }

  if (!events.length) {
    return (
      <div className="animate-fade-in rounded-2xl bg-white/60 px-6 py-14 text-center ring-1 ring-barrete/5">
        <p className="text-sm font-medium text-ink/55">
          {favoritesEmpty
            ? t.favoritesEmpty
            : placeEmpty
              ? t.placeFilterEmpty
              : hasFilter
                ? t.noEventsFilter
                : t.noEvents}
        </p>
      </div>
    )
  }

  if (groups) {
    let cardIndex = 0
    return (
      <div className="flex flex-col gap-7">
        {groups.map(({ date, meta, events: dayEvents }) => {
          const label = meta
            ? `${t.weekdaysFull[meta.weekdayKey]} ${meta.dayNum}`
            : date
          return (
            <section key={date} aria-labelledby={`dia-grupo-${date}`}>
              <h3
                id={`dia-grupo-${date}`}
                className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-barrete/15 pb-2 font-display text-base font-semibold text-barrete sm:text-lg"
              >
                <span>{label}</span>
                {meta?.special === 'alcochetano' ? (
                  <span className="text-xs font-sans font-medium text-vermelho">
                    · {t.alcochetano}
                  </span>
                ) : null}
              </h3>
              <ul className="flex flex-col gap-3">
                {dayEvents.map((event) => {
                  const i = cardIndex++
                  return (
                    <li key={event.id} id={`evento-${event.id}`}>
                      <EventCard
                        event={event}
                        index={i}
                        highlighted={highlightId === event.id}
                      />
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {events.map((event, i) => (
        <li key={event.id} id={`evento-${event.id}`}>
          <EventCard
            event={event}
            index={i}
            highlighted={highlightId === event.id}
          />
        </li>
      ))}
    </ul>
  )
}
