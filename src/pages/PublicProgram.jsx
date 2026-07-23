import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapPin, Search, Star, X } from 'lucide-react'
import { FESTIVAL_DAYS } from '../data/days'
import {
  eventMatchesPlace,
  getMapPlace,
} from '../data/mapPlaces'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LangContext'
import { eventDateTime, useFavorites } from '../hooks/useLocalExtras'
import Header from '../components/Header'
import DayTabs from '../components/DayTabs'
import CategoryFilter from '../components/CategoryFilter'
import EventList from '../components/EventList'
import Footer from '../components/Footer'

/** Ordena horas no formato HH:MM; trata madrugada (00–05) como depois da noite */
function timeSortKey(hora) {
  const match = String(hora).match(/(\d{1,2}):(\d{2})/)
  if (!match) return 0
  let h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  if (h >= 0 && h < 6) h += 24
  return h * 60 + m
}

function sortEvents(list) {
  return [...(list || [])].sort((a, b) => {
    const d = String(a.dia).localeCompare(String(b.dia))
    if (d !== 0) return d
    const tDiff = timeSortKey(a.hora) - timeSortKey(b.hora)
    if (tDiff !== 0) return tDiff
    return (a.ordem ?? 0) - (b.ordem ?? 0)
  })
}

function defaultDay() {
  const today = new Date()
  const iso = today.toISOString().slice(0, 10)
  const found = FESTIVAL_DAYS.find((d) => d.date === iso)
  return found ? found.date : FESTIVAL_DAYS[0].date
}

function eventMatchesQuery(event, q) {
  if (!q) return true
  const hay = [event.titulo, event.subtitulo, event.local, event.descricao, event.categoria]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

/** Evento em curso (~90 min) ou o próximo ainda por começar. */
function findNextOrCurrentEvent(events, now = new Date()) {
  if (!events.length) return null
  let current = null
  let next = null
  for (const e of events) {
    const start = eventDateTime(e.dia, e.hora)
    const end = new Date(start.getTime() + 90 * 60 * 1000)
    if (now >= start && now <= end) {
      current = e
      break
    }
    if (start > now && (!next || start < eventDateTime(next.dia, next.hora))) {
      next = e
    }
  }
  return current || next || null
}

export default function PublicProgram() {
  const { t } = useLang()
  const [searchParams, setSearchParams] = useSearchParams()
  const { ids: favIds, count: favCount } = useFavorites()

  const paramDia = searchParams.get('dia')
  const paramEvento = searchParams.get('evento')
  const paramLocal = searchParams.get('local')

  const placeFilter = useMemo(
    () => (paramLocal ? getMapPlace(paramLocal) : null),
    [paramLocal]
  )

  const [selectedDate, setSelectedDate] = useState(() => {
    if (paramDia && FESTIVAL_DAYS.some((d) => d.date === paramDia)) return paramDia
    return defaultDay()
  })
  const [category, setCategory] = useState(null)
  const [query, setQuery] = useState('')
  const [showNow, setShowNow] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [highlightId, setHighlightId] = useState(paramEvento)

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const todayInFestival = FESTIVAL_DAYS.some((d) => d.date === todayIso)

  const dayMeta = useMemo(
    () => FESTIVAL_DAYS.find((d) => d.date === selectedDate),
    [selectedDate]
  )

  const clearPlaceFilter = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('local')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const selectDay = useCallback(
    (date) => {
      setSelectedDate(date)
      setShowNow(false)
      setFavoritesOnly(false)
      const next = new URLSearchParams(searchParams)
      next.set('dia', date)
      next.delete('evento')
      next.delete('local')
      setSearchParams(next, { replace: true })
      setHighlightId(null)
    },
    [searchParams, setSearchParams]
  )

  const goToday = useCallback(() => {
    if (!todayInFestival) return
    selectDay(todayIso)
  }, [todayInFestival, todayIso, selectDay])

  const goNow = useCallback(() => {
    const day = todayInFestival ? todayIso : selectedDate
    setFavoritesOnly(false)
    setShowNow(true)
    setSelectedDate(day)
    const next = new URLSearchParams(searchParams)
    next.set('dia', day)
    next.delete('evento')
    next.delete('local')
    setSearchParams(next, { replace: true })
  }, [todayInFestival, todayIso, selectedDate, searchParams, setSearchParams])

  const favKey = favIds.join(',')

  const fetchEvents = useCallback(async () => {
    setLoading(true)

    if (favoritesOnly) {
      if (!favIds.length) {
        setEvents([])
        setLoading(false)
        return
      }
      const { data, error } = await supabase.from('eventos').select('*').in('id', favIds)
      if (error) {
        console.error(error)
        setEvents([])
      } else {
        setEvents(sortEvents(data))
      }
      setLoading(false)
      return
    }

    // Filtro por local do mapa: todos os dias das festas
    if (placeFilter) {
      const days = FESTIVAL_DAYS.map((d) => d.date)
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .in('dia', days)
      if (error) {
        console.error(error)
        setEvents([])
      } else {
        setEvents(
          sortEvents((data || []).filter((e) => eventMatchesPlace(e, placeFilter)))
        )
      }
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('dia', selectedDate)

    if (error) {
      console.error(error)
      setEvents([])
    } else {
      setEvents(sortEvents(data))
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- favIds via favKey
  }, [selectedDate, favoritesOnly, favKey, placeFilter])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    if (!paramEvento || loading) return
    const el = document.getElementById(`evento-${paramEvento}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightId(paramEvento)
    }
  }, [paramEvento, loading, events])

  useEffect(() => {
    if (!showNow || loading || paramEvento || placeFilter) return
    const target = findNextOrCurrentEvent(events)
    if (!target) {
      setHighlightId(null)
      return
    }
    setHighlightId(target.id)
    const el = document.getElementById(`evento-${target.id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [showNow, loading, events, paramEvento, placeFilter])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter((e) => {
      if (category && e.categoria !== category) return false
      if (!eventMatchesQuery(e, q)) return false
      return true
    })
  }, [events, category, query])

  const hasExtraFilter = Boolean(
    category || favoritesOnly || query.trim() || showNow || placeFilter
  )

  const placeLabel = placeFilter
    ? t.map?.places?.[placeFilter.nameKey] || placeFilter.name
    : null

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <DayTabs
        selectedDate={placeFilter || favoritesOnly ? null : selectedDate}
        onSelect={selectDay}
      />
      <CategoryFilter selected={category} onSelect={setCategory} />

      <div className="border-b border-barrete/10 bg-creme/80">
        <div className="mx-auto flex max-w-3xl flex-col gap-2.5 px-4 py-3 sm:px-6">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-xl border-0 bg-white py-2.5 pl-9 pr-3 text-sm text-ink shadow-sm ring-1 ring-barrete/10 placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-barrete/30"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {todayInFestival ? (
              <button
                type="button"
                onClick={goToday}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selectedDate === todayIso &&
                  !showNow &&
                  !favoritesOnly &&
                  !placeFilter
                    ? 'bg-barrete text-white'
                    : 'bg-white text-ink/70 ring-1 ring-barrete/10 hover:bg-barrete/5'
                }`}
              >
                {t.today}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (showNow) {
                  setShowNow(false)
                  setHighlightId(null)
                } else {
                  goNow()
                }
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                showNow
                  ? 'bg-vermelho text-white'
                  : 'bg-white text-ink/70 ring-1 ring-barrete/10 hover:bg-barrete/5'
              }`}
            >
              {t.now}
            </button>
            <button
              type="button"
              onClick={() => {
                setFavoritesOnly((v) => !v)
                setShowNow(false)
                setHighlightId(null)
                if (!favoritesOnly) clearPlaceFilter()
              }}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                favoritesOnly
                  ? 'bg-dourado text-ink'
                  : 'bg-white text-ink/70 ring-1 ring-barrete/10 hover:bg-barrete/5'
              }`}
            >
              <Star className="h-3.5 w-3.5" aria-hidden />
              {t.favoritesOnly}
              {favCount > 0 ? (
                <span className="tabular-nums opacity-80">({favCount})</span>
              ) : null}
            </button>
            {placeFilter ? (
              <button
                type="button"
                onClick={clearPlaceFilter}
                className="inline-flex items-center gap-1 rounded-full bg-tejo/15 px-3 py-1.5 text-xs font-semibold text-tejo ring-1 ring-tejo/20"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {placeLabel}
                <X className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">{t.placeFilterClear}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 sm:px-6">
        {favoritesOnly ? (
          <h2 className="mb-4 font-display text-lg font-semibold text-barrete sm:text-xl">
            {t.favoritesOnly}
          </h2>
        ) : placeFilter ? (
          <h2 className="mb-4 font-display text-lg font-semibold text-barrete sm:text-xl">
            {t.placeFilter}: {placeLabel}
          </h2>
        ) : dayMeta ? (
          <h2 className="mb-4 font-display text-lg font-semibold text-barrete sm:text-xl">
            {t.weekdaysFull[dayMeta.weekdayKey]} {dayMeta.dayNum}
            {dayMeta.special === 'alcochetano' ? (
              <span className="ml-2 text-sm font-sans font-medium text-vermelho">
                · {t.alcochetano}
              </span>
            ) : null}
          </h2>
        ) : null}
        <EventList
          events={filtered}
          loading={loading}
          hasFilter={hasExtraFilter}
          favoritesEmpty={favoritesOnly && favIds.length === 0}
          placeEmpty={Boolean(placeFilter) && !loading && filtered.length === 0 && !query.trim() && !category}
          highlightId={highlightId}
          groupByDay={Boolean(placeFilter || favoritesOnly)}
        />
      </main>

      <Footer />
    </div>
  )
}
