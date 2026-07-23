import { useCallback, useEffect, useMemo, useState } from 'react'
import { FESTIVAL_DAYS } from '../data/days'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LangContext'
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

function defaultDay() {
  const today = new Date()
  const iso = today.toISOString().slice(0, 10)
  const found = FESTIVAL_DAYS.find((d) => d.date === iso)
  return found ? found.date : FESTIVAL_DAYS[0].date
}

export default function PublicProgram() {
  const { t } = useLang()
  const [selectedDate, setSelectedDate] = useState(defaultDay)
  const [category, setCategory] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const dayMeta = useMemo(
    () => FESTIVAL_DAYS.find((d) => d.date === selectedDate),
    [selectedDate]
  )

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('dia', selectedDate)

    if (error) {
      console.error(error)
      setEvents([])
    } else {
      const sorted = [...(data || [])].sort((a, b) => {
        const tDiff = timeSortKey(a.hora) - timeSortKey(b.hora)
        if (tDiff !== 0) return tDiff
        return (a.ordem ?? 0) - (b.ordem ?? 0)
      })
      setEvents(sorted)
    }
    setLoading(false)
  }, [selectedDate])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const filtered = useMemo(() => {
    if (!category) return events
    return events.filter((e) => e.categoria === category)
  }, [events, category])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <DayTabs selectedDate={selectedDate} onSelect={setSelectedDate} />
      <CategoryFilter selected={category} onSelect={setCategory} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 sm:px-6">
        {dayMeta && (
          <h2 className="mb-4 font-display text-lg font-semibold text-barrete sm:text-xl">
            {t.weekdaysFull[dayMeta.weekdayKey]} {dayMeta.dayNum}
            {dayMeta.special === 'alcochetano' ? (
              <span className="ml-2 text-sm font-sans font-medium text-vermelho">
                · {t.alcochetano}
              </span>
            ) : null}
          </h2>
        )}
        <EventList
          events={filtered}
          loading={loading}
          hasFilter={Boolean(category)}
        />
      </main>

      <Footer />
    </div>
  )
}
