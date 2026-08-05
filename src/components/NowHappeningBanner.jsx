import { Clock } from 'lucide-react'
import {
  eventDateTime,
  eventDurationMinutes,
  findNextOrCurrentEvent,
} from '../lib/datetime'
import { eventLocalSummary } from '../lib/eventLocal'
import { isEntradaGpsRouteEvent } from '../lib/locations'

function statusFor(event, now) {
  if (!event) return null
  const start = eventDateTime(event.dia, event.hora)
  const end = new Date(start.getTime() + eventDurationMinutes(event) * 60 * 1000)
  if (now >= start && now <= end) return 'live'
  if (start > now) return 'next'
  return null
}

/**
 * Faixa no topo do programa: evento a decorrer ou a seguir (hoje).
 */
export default function NowHappeningBanner({
  events,
  labels,
  onOpen,
  now = new Date(),
}) {
  const event = findNextOrCurrentEvent(events, now)
  if (!event) return null
  const status = statusFor(event, now)
  if (!status) return null

  const statusLabel =
    status === 'live'
      ? labels?.happeningNow || 'A decorrer agora'
      : labels?.happeningNext || 'A seguir'

  return (
    <button
      type="button"
      onClick={() => onOpen?.(event)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition sm:px-6 ${
        status === 'live'
          ? 'bg-vermelho/12 hover:bg-vermelho/18'
          : 'bg-dourado/20 hover:bg-dourado/28'
      }`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          status === 'live' ? 'bg-vermelho text-white' : 'bg-dourado text-ink'
        }`}
        aria-hidden
      >
        <Clock className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[0.65rem] font-bold uppercase tracking-wide ${
            status === 'live' ? 'text-vermelho' : 'text-ink/60'
          }`}
        >
          {statusLabel}
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-ink">
          <span className="tabular-nums text-barrete">{event.hora}</span>
          {' · '}
          {event.titulo}
        </span>
        {event.local || isEntradaGpsRouteEvent(event) ? (
          <span className="mt-0.5 block truncate text-xs text-ink/55">
            {eventLocalSummary(event)}
          </span>
        ) : null}
      </span>
    </button>
  )
}
