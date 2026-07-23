import { Link } from 'react-router-dom'
import { Store } from 'lucide-react'
import { FESTIVAL_DAYS } from '../data/days'
import { useLang } from '../context/LangContext'

export default function DayTabs({ selectedDate, onSelect }) {
  const { t } = useLang()

  return (
    <div className="sticky top-0 z-20 border-b border-barrete/10 bg-creme/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-stretch gap-2 px-3 py-3 sm:px-6">
        <div className="hide-scrollbar min-w-0 flex-1 overflow-x-auto pb-1">
          <div className="flex gap-2">
            {FESTIVAL_DAYS.map((day) => {
              const active = selectedDate === day.date
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => onSelect(day.date)}
                  className={`flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-2xl px-3 py-2.5 transition-all duration-200 ${
                    active
                      ? 'scale-[1.02] bg-barrete text-white shadow-md shadow-barrete/25'
                      : 'bg-white text-ink/80 shadow-sm hover:bg-barrete/5'
                  }`}
                >
                  <span
                    className={`text-[0.65rem] font-semibold uppercase tracking-wider ${
                      active ? 'text-dourado' : 'text-barrete-light'
                    }`}
                  >
                    {t.weekdays[day.weekdayKey]}
                  </span>
                  <span className="text-lg font-bold leading-none">{day.dayNum}</span>
                  {day.special === 'alcochetano' && (
                    <span
                      className={`mt-1 max-w-[4.5rem] truncate text-[0.55rem] font-medium leading-tight ${
                        active ? 'text-white/80' : 'text-vermelho'
                      }`}
                    >
                      {t.alcochetano}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <Link
          to="/comercio"
          className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-dourado/90 px-2.5 py-2 text-ink shadow-sm transition hover:bg-dourado sm:px-3"
          title={t.businessesLink}
        >
          <Store className="h-4 w-4" aria-hidden />
          <span className="text-[0.6rem] font-bold leading-tight tracking-wide">
            {t.businessesShort}
          </span>
        </Link>
      </div>
    </div>
  )
}
