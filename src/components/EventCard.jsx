import { useState } from 'react'
import {
  AlertTriangle,
  Bell,
  BellOff,
  ChevronDown,
  MapPin,
  Route,
  Share2,
  Star,
  Ticket,
} from 'lucide-react'
import { CATEGORY_COLORS } from '../data/categories'
import { useLang } from '../context/LangContext'
import {
  eventDateTime,
  useFavorites,
  useReminders,
} from '../hooks/useLocalExtras'
import { formatLocalReminderValue } from '../lib/datetime'
import {
  cancelServerReminder,
  ensurePushForReminders,
  getCurrentPushEndpoint,
  scheduleServerReminder,
} from '../lib/reminders'
import { track } from '../lib/analytics'
import {
  isCorridaEvent,
  isRouteMapEvent,
  isStreetBullEvent,
  mapsDirectionsUrl,
  mapsUrl,
  parseLocations,
  displayPlace,
} from '../lib/locations'

/** Divide a descrição em secções (título em MAIÚSCULAS + linhas) */
function parseDescricao(text) {
  if (!text?.trim()) return []
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const sections = []
  let current = null

  for (const raw of lines) {
    const line = raw.trimEnd()
    const trimmed = line.trim()
    if (!trimmed) {
      if (current) current.items.push('')
      continue
    }
    const isHeading =
      trimmed === trimmed.toUpperCase() &&
      /[A-ZÀ-Ú]/.test(trimmed) &&
      trimmed.length < 40 &&
      !trimmed.includes('·')

    if (isHeading) {
      current = { title: trimmed, items: [] }
      sections.push(current)
    } else if (current) {
      current.items.push(trimmed)
    } else {
      current = { title: null, items: [trimmed] }
      sections.push(current)
    }
  }

  return sections.map((s) => ({
    ...s,
    items: s.items.filter(
      (i, idx, arr) => i !== '' || (arr[idx - 1] && arr[idx - 1] !== '')
    ),
  }))
}

function LocationBlock({ local, t, asRoute }) {
  const streets = parseLocations(local)

  if (streets.length === 0) {
    return (
      <p className="inline-flex max-w-full items-start gap-1.5 text-sm text-ink/65">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-tejo" aria-hidden />
        <span className="leading-snug">{local}</span>
      </p>
    )
  }

  if (streets.length === 1) {
    const label = displayPlace(streets[0])
    return (
      <a
        href={mapsUrl(streets[0])}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-full items-start gap-1.5 text-sm text-tejo transition-colors hover:text-barrete"
        title={t.openMaps}
      >
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span className="leading-snug underline-offset-2 hover:underline">
          {label}
        </span>
      </a>
    )
  }

  // Entradas: um percurso início → fim no Maps
  if (asRoute) {
    return (
      <div className="space-y-2">
        <p className="text-xs leading-snug text-ink/55">{t.routePathNote}</p>
        <a
          href={mapsDirectionsUrl(streets)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-tejo/10 px-3 py-1.5 text-xs font-semibold text-tejo transition hover:bg-tejo/15"
          title={t.openRoute}
        >
          <Route className="h-3.5 w-3.5" aria-hidden />
          {t.openRoute}
        </a>
        <p className="text-[0.7rem] leading-relaxed text-ink/45">
          {displayPlace(streets[0])}
          <span className="mx-1 text-ink/30">→</span>
          {displayPlace(streets[streets.length - 1])}
        </p>
      </div>
    )
  }

  // Largadas e outros: rua a rua
  return (
    <div className="space-y-1.5">
      <p className="flex items-start gap-1.5 text-xs leading-snug text-ink/55">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tejo" aria-hidden />
        <span>{t.routeNote}</span>
      </p>
      <ul className="flex flex-col gap-1 pl-5">
        {streets.map((street) => (
          <li key={street}>
            <a
              href={mapsUrl(street)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-tejo underline-offset-2 transition-colors hover:text-barrete hover:underline"
              title={`${t.openMaps}: ${displayPlace(street)}`}
            >
              {displayPlace(street)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function EventCard({ event, index, highlighted }) {
  const { t } = useLang()
  const { has, toggle } = useFavorites()
  const { getReminder, setReminder, clearReminder } = useReminders()
  const favorited = has(event.id)
  const reminderAt = getReminder(event.id)
  const colors = CATEGORY_COLORS[event.categoria] || CATEGORY_COLORS.Institucional
  const isCorrida = isCorridaEvent(event)
  const isStreetBull = isStreetBullEvent(event)
  const asRoute = isRouteMapEvent(event)
  const [open, setOpen] = useState(false)
  const [safetyOpen, setSafetyOpen] = useState(false)
  const [shareMsg, setShareMsg] = useState(false)
  const [remindBusy, setRemindBusy] = useState(false)
  const sections = parseDescricao(event.descricao)

  async function handleShare() {
    const url = `${window.location.origin}/?dia=${encodeURIComponent(event.dia)}&evento=${encodeURIComponent(event.id)}`
    const title = event.titulo
    const text = `${event.hora} · ${event.titulo}${event.local ? ` — ${event.local}` : ''}`
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url })
        track('share', { event_id: event.id })
        return
      }
    } catch {
      /* cancelled or failed — fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(url)
      track('share', { event_id: event.id })
      setShareMsg(true)
      window.setTimeout(() => setShareMsg(false), 2000)
    } catch {
      /* ignore */
    }
  }

  async function handleRemind() {
    if (remindBusy) return
    setRemindBusy(true)
    try {
      if (reminderAt) {
        if (String(reminderAt).startsWith('local:')) {
          clearReminder(event.id)
          track('reminder_cancel', { event_id: event.id })
          return
        }
        const endpoint = await getCurrentPushEndpoint()
        if (!endpoint) {
          window.alert(t.remindCancelError || t.remindNeedPermission)
          return
        }
        const err = await cancelServerReminder(event.id, endpoint)
        if (err) {
          console.error(err)
          window.alert(t.remindCancelError || t.remindNeedPermission)
          return
        }
        clearReminder(event.id)
        track('reminder_cancel', { event_id: event.id })
        return
      }

      const start = eventDateTime(event.dia, event.hora)
      const when = new Date(start.getTime() - 30 * 60 * 1000)
      if (when.getTime() <= Date.now()) {
        window.alert(t.remindTooSoon || t.remindNeedPermission)
        return
      }

      const ready = await ensurePushForReminders()
      if (!ready.ok) {
        if (ready.reason === 'needInstall') {
          window.alert(t.remindNeedInstall || t.remindNeedPermission)
        } else if (ready.reason === 'inApp') {
          window.alert(t.notify?.androidBrowser || t.remindNeedPermission)
        } else if (ready.reason === 'timeout' || ready.reason === 'sw') {
          window.alert(t.notify?.errorTimeout || t.notifyPrefs?.enableTimeout || t.remindNeedPermission)
        } else {
          window.alert(t.remindNeedPermission)
        }
        return
      }

      const url = `/?dia=${encodeURIComponent(event.dia)}&evento=${encodeURIComponent(event.id)}`
      const title = t.reminders?.title || 'Festas Alcochete'
      const body =
        `${event.hora} · ${event.titulo}` +
        (event.local ? ` — ${event.local}` : '')

      const err = await scheduleServerReminder({
        eventId: event.id,
        endpoint: ready.endpoint,
        scheduledFor: when.toISOString(),
        title,
        body,
        url,
      })

      if (err) {
        console.error(err)
        setReminder(
          event.id,
          formatLocalReminderValue(when.toISOString(), event.dia)
        )
        track('reminder_set', { event_id: event.id, local: true })
        window.alert(t.remindLocalOnly || t.remindOn)
        return
      }

      setReminder(event.id, when.toISOString())
      track('reminder_set', { event_id: event.id })
    } finally {
      setRemindBusy(false)
    }
  }

  return (
    <article
      className={`animate-fade-up overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md ${
        highlighted
          ? 'ring-2 ring-dourado shadow-dourado/20'
          : isCorrida
            ? 'ring-2 ring-vermelho/25 shadow-vermelho/5'
            : isStreetBull
              ? 'ring-2 ring-dourado/40 shadow-dourado/10'
              : 'ring-1 ring-barrete/5 shadow-barrete/5'
      }`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      {isCorrida && (
        <div className="bg-gradient-to-r from-vermelho to-[#A93226] px-4 py-1.5 text-center text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white">
          {t.corridaBadge}
        </div>
      )}

      {isStreetBull && (
        <button
          type="button"
          onClick={() => setSafetyOpen((v) => !v)}
          className="flex w-full items-start gap-2 bg-dourado/20 px-3.5 py-2 text-left text-ink/90 transition hover:bg-dourado/30"
          aria-expanded={safetyOpen}
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-[0.7rem] font-semibold leading-snug sm:text-xs">
              {t.streetBullCaution}
              <span className="ml-1 font-medium text-[#B45309]/underline">
                {safetyOpen ? t.hideSafety : t.showSafety}
              </span>
            </p>
            {safetyOpen ? (
              <p className="mt-2 text-[0.7rem] font-normal leading-relaxed text-ink/70">
                {t.safetyNote}
              </p>
            ) : null}
          </div>
        </button>
      )}

      <div className="p-4">
        <div className="flex gap-3">
          <div
            className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-xl px-1 py-2 ${
              isCorrida
                ? 'bg-vermelho/10'
                : isStreetBull
                  ? 'bg-dourado/20'
                  : 'bg-barrete/8'
            }`}
          >
            <span
              className={`font-display text-base font-bold leading-none sm:text-lg ${
                isCorrida
                  ? 'text-vermelho'
                  : isStreetBull
                    ? 'text-[#B45309]'
                    : 'text-barrete'
              }`}
            >
              {event.hora}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-[0.95rem] font-semibold leading-snug text-ink sm:text-base">
                  {event.titulo}
                </h3>
                {event.subtitulo ? (
                  <p className="mt-0.5 text-sm font-medium text-vermelho/90">
                    {event.subtitulo}
                  </p>
                ) : null}
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {t.categories[event.categoria] || event.categoria}
              </span>
            </div>

            {event.local ? (
              <LocationBlock local={event.local} t={t} asRoute={asRoute} />
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {event.bilhetes_url ? (
                <a
                  href={event.bilhetes_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('ticket_click', { event_id: event.id })}
                  className="inline-flex items-center gap-1.5 rounded-full bg-vermelho px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#A93226]"
                >
                  <Ticket className="h-3.5 w-3.5" aria-hidden />
                  {t.buyTickets}
                </a>
              ) : null}
              {event.descricao?.trim() ? (
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-3.5 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-ink/10"
                  aria-expanded={open}
                >
                  {open ? t.hideDetails : t.showDetails}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => toggle(event.id)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  favorited
                    ? 'bg-dourado/25 text-[#8B5A12]'
                    : 'bg-ink/5 text-ink/65 hover:bg-ink/10'
                }`}
                aria-pressed={favorited}
                title={favorited ? t.favoriteRemove : t.favoriteAdd}
              >
                <Star
                  className={`h-3.5 w-3.5 ${favorited ? 'fill-current' : ''}`}
                  aria-hidden
                />
                {favorited ? t.favoriteRemove : t.favoriteAdd}
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1.5 text-xs font-semibold text-ink/65 transition hover:bg-ink/10"
                title={t.share}
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden />
                {shareMsg ? t.shareCopied : t.share}
              </button>
              <button
                type="button"
                onClick={handleRemind}
                disabled={remindBusy}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                  reminderAt
                    ? 'bg-tejo/15 text-tejo'
                    : 'bg-ink/5 text-ink/65 hover:bg-ink/10'
                }`}
                aria-pressed={Boolean(reminderAt)}
                title={
                  reminderAt
                    ? t.remindOn
                    : `${t.remind}. ${t.remindHint || ''}`
                }
              >
                {reminderAt ? (
                  <Bell className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <BellOff className="h-3.5 w-3.5" aria-hidden />
                )}
                {reminderAt ? t.remindOn : t.remind}
              </button>
            </div>
          </div>
        </div>

        {open && sections.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-barrete/10 pt-4 animate-fade-in">
            {sections.map((section, i) => (
              <div key={i}>
                {section.title ? (
                  <h4 className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-vermelho">
                    {section.title}
                  </h4>
                ) : null}
                <ul className="space-y-0.5">
                  {section.items.map((item, j) =>
                    item === '' ? (
                      <li key={j} className="h-1" aria-hidden />
                    ) : (
                      <li key={j} className="text-sm leading-snug text-ink/80">
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
