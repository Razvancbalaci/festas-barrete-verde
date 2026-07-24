import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapPin, Search, Star, X } from 'lucide-react'
import { FESTIVAL_DAYS, programDayIso } from '../data/days'
import {
  eventMatchesPlace,
  getMapPlace,
} from '../data/mapPlaces'
import {
  findNextOrCurrentEvent,
  sortEvents,
} from '../lib/datetime'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LangContext'
import { useFavorites } from '../hooks/useLocalExtras'
import { track } from '../lib/analytics'
import Header from '../components/Header'
import DayTabs from '../components/DayTabs'
import CategoryFilter from '../components/CategoryFilter'
import EventList from '../components/EventList'
import Footer from '../components/Footer'

function eventMatchesQuery(event, q) {
  if (!q) return true
  const hay = [event.titulo, event.subtitulo, event.local, event.descricao, event.categoria]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

export default function PublicProgram() {
  const { t } = useLang()
  const [searchParams, setSearchParams] = useSearchParams()
  const { ids: favIds, count: favCount } = useFavorites()

  const paramDia = searchParams.get('dia')
  const paramEvento = searchParams.get('evento')
  const paramLocal = searchParams.get('local')

  const placeFilter = useMemo(() => {
    if (!paramLocal) return null
    const place = getMapPlace(paramLocal)
    // Pins sem matchTerms (ex. WC) não activam filtro de programa
    if (!place?.matchTerms?.length) return null
    return place
  }, [paramLocal])

  const [todayIso, setTodayIso] = useState(() => programDayIso())
  const [selectedDate, setSelectedDate] = useState(() => {
    if (paramDia && FESTIVAL_DAYS.some((d) => d.date === paramDia)) return paramDia
    return programDayIso()
  })
  const [category, setCategory] = useState(null)
  const [query, setQuery] = useState('')
  const [showNow, setShowNow] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [highlightId, setHighlightId] = useState(paramEvento)
  const [eventDiaResolved, setEventDiaResolved] = useState(
    () => !(paramEvento && !paramDia)
  )
  const fetchGen = useRef(0)

  const needsEventDayResolve = Boolean(
    paramEvento && !paramDia && !placeFilter && !favoritesOnly
  )

  const todayInFestival = FESTIVAL_DAYS.some((d) => d.date === todayIso)

  const dayMeta = useMemo(
    () => FESTIVAL_DAYS.find((d) => d.date === selectedDate),
    [selectedDate]
  )

  // Dia de cartaz «Hoje» — madrugada 00–05h ainda conta o dia anterior
  useEffect(() => {
    const refresh = () => setTodayIso(programDayIso())
    const id = window.setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  // `?local=` inválido → limpar da URL
  useEffect(() => {
    if (!paramLocal || placeFilter) return
    const next = new URLSearchParams(searchParams)
    next.delete('local')
    setSearchParams(next, { replace: true })
  }, [paramLocal, placeFilter, searchParams, setSearchParams])

  // Entrar pelo mapa: desligar favoritos / Agora
  useEffect(() => {
    if (!placeFilter) return
    setFavoritesOnly(false)
    setShowNow(false)
  }, [placeFilter])

  // Sincronizar dia com a URL (Back/Forward, links partilhados)
  useEffect(() => {
    if (placeFilter || favoritesOnly) return
    if (paramDia && FESTIVAL_DAYS.some((d) => d.date === paramDia)) {
      setSelectedDate((prev) => (prev === paramDia ? prev : paramDia))
    }
  }, [paramDia, placeFilter, favoritesOnly])

  // Deep link `?evento=` sem `dia` → resolver o dia no servidor antes de listar
  useEffect(() => {
    if (!paramEvento || paramDia || placeFilter || favoritesOnly) {
      setEventDiaResolved(true)
      return
    }
    setEventDiaResolved(false)
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('eventos')
        .select('dia')
        .eq('id', paramEvento)
        .maybeSingle()
      if (cancelled) return
      if (error || !data?.dia || !FESTIVAL_DAYS.some((d) => d.date === data.dia)) {
        setEventDiaResolved(true)
        return
      }
      setSelectedDate(data.dia)
      const next = new URLSearchParams(searchParams)
      next.set('dia', data.dia)
      setSearchParams(next, { replace: true })
      setEventDiaResolved(true)
    })()
    return () => {
      cancelled = true
    }
  }, [
    paramEvento,
    paramDia,
    placeFilter,
    favoritesOnly,
    searchParams,
    setSearchParams,
  ])

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
    track('filter_today')
    selectDay(todayIso)
  }, [todayInFestival, todayIso, selectDay])

  const goNow = useCallback(() => {
    const day = todayInFestival ? todayIso : selectedDate
    track('filter_now')
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
    if (needsEventDayResolve && !eventDiaResolved) {
      setLoading(true)
      return
    }

    const gen = ++fetchGen.current
    setLoading(true)

    const apply = (list) => {
      if (gen !== fetchGen.current) return
      setEvents(sortEvents(list))
      setLoading(false)
    }

    if (favoritesOnly) {
      if (!favIds.length) {
        apply([])
        return
      }
      const { data, error } = await supabase.from('eventos').select('*').in('id', favIds)
      if (error) {
        console.error(error)
        apply([])
      } else {
        apply(data)
      }
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
        apply([])
      } else {
        apply((data || []).filter((e) => eventMatchesPlace(e, placeFilter)))
      }
      return
    }

    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('dia', selectedDate)

    if (error) {
      console.error(error)
      apply([])
    } else {
      apply(data)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- favIds via favKey
  }, [
    selectedDate,
    favoritesOnly,
    favKey,
    placeFilter,
    needsEventDayResolve,
    eventDiaResolved,
  ])

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
      <CategoryFilter
        selected={category}
        onSelect={(cat) => {
          track('filter_category', { category: cat || 'all' })
          setCategory(cat)
        }}
      />

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
              onChange={(e) => {
                const value = e.target.value
                setQuery(value)
                if (value.trim().length === 1) track('search')
              }}
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
                const enabling = !favoritesOnly
                if (enabling) track('filter_favorites')
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
          placeEmpty={
            Boolean(placeFilter) &&
            !loading &&
            filtered.length === 0 &&
            !query.trim() &&
            !category
          }
          highlightId={highlightId}
          groupByDay={Boolean(placeFilter || favoritesOnly)}
        />
      </main>

      <Footer />
    </div>
  )
}
