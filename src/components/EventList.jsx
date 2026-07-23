import { Loader2 } from 'lucide-react'
import { useLang } from '../context/LangContext'
import EventCard from './EventCard'

export default function EventList({
  events,
  loading,
  hasFilter,
  favoritesEmpty,
  highlightId,
}) {
  const { t } = useLang()

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
            : hasFilter
              ? t.noEventsFilter
              : t.noEvents}
        </p>
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
