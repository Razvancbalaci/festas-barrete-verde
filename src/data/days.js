import { addCalendarDays, localDateIso } from '../lib/datetime'

/** Dias oficiais das festas 2026 */
export const FESTIVAL_DAYS = [
  { date: '2026-08-07', weekdayKey: 'fri', dayNum: 7, special: null },
  { date: '2026-08-08', weekdayKey: 'sat', dayNum: 8, special: null },
  { date: '2026-08-09', weekdayKey: 'sun', dayNum: 9, special: null },
  { date: '2026-08-10', weekdayKey: 'mon', dayNum: 10, special: 'alcochetano' },
  { date: '2026-08-11', weekdayKey: 'tue', dayNum: 11, special: null },
  { date: '2026-08-12', weekdayKey: 'wed', dayNum: 12, special: null },
  { date: '2026-08-13', weekdayKey: 'thu', dayNum: 13, special: null },
]

const FESTIVAL_DATE_SET = new Set(FESTIVAL_DAYS.map((d) => d.date))

/**
 * Dia de cartaz «activo» agora.
 * Entre 00:00–05:59 a madrugada ainda pertence ao dia anterior do programa
 * (ex.: sábado 3h → cartaz de sábado, não domingo).
 */
export function programDayIso(now = new Date()) {
  const civil = localDateIso(now)
  if (now.getHours() < 6) {
    const prev = addCalendarDays(civil, -1)
    if (FESTIVAL_DATE_SET.has(prev)) return prev
  }
  return defaultFestivalDay(civil)
}

/** Dia predefinido: hoje se estiver nas festas, senão o 1.º dia. */
export function defaultFestivalDay(todayIso) {
  const found = FESTIVAL_DAYS.find((d) => d.date === todayIso)
  return found ? found.date : FESTIVAL_DAYS[0].date
}
