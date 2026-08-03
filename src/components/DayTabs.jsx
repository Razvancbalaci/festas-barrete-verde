import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Map as MapIcon, Store } from 'lucide-react'
import { FESTIVAL_DAYS } from '../data/days'
import { useLang } from '../context/LangContext'

/** Posiciona o dia activo ligeiramente à esquerda do centro (~38%). */
function scrollSelectedIntoView(scroller, button, behavior) {
  if (!scroller || !button) return

  const scrollerRect = scroller.getBoundingClientRect()
  const buttonRect = button.getBoundingClientRect()
  const buttonCenter =
    buttonRect.left -
    scrollerRect.left +
    scroller.scrollLeft +
    buttonRect.width / 2
  const target = buttonCenter - scroller.clientWidth * 0.38
  const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
  const next = Math.max(0, Math.min(maxScroll, target))

  if (Math.abs(scroller.scrollLeft - next) < 2) return
  scroller.scrollTo({ left: next, behavior })
}

export default function DayTabs({ selectedDate, onSelect }) {
  const { t } = useLang()
  const scrollerRef = useRef(null)
  const btnRefs = useRef(new globalThis.Map())
  const firstScroll = useRef(true)
  const userTouching = useRef(false)

  useEffect(() => {
    if (!selectedDate) return

    const scroller = scrollerRef.current
    const button = btnRefs.current.get(selectedDate)
    if (!scroller || !button) return

    // Evita lutar com um swipe em curso
    if (userTouching.current) return

    const behavior = firstScroll.current ? 'auto' : 'smooth'
    firstScroll.current = false

    // rAF: layout estável após o estado activo (scale) aplicar
    const id = window.requestAnimationFrame(() => {
      scrollSelectedIntoView(scroller, button, behavior)
    })
    return () => window.cancelAnimationFrame(id)
  }, [selectedDate])

  return (
    <div className="sticky top-0 z-20 border-b border-barrete/10 bg-creme/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-stretch gap-2 px-3 py-3 sm:px-6">
        {/* Só os dias fazem scroll; Mapa/Comércio ficam fixos à direita */}
        <div
          ref={scrollerRef}
          className="hide-scrollbar min-w-0 flex-1 overflow-x-auto overscroll-x-contain pb-1"
          onTouchStart={() => {
            userTouching.current = true
          }}
          onTouchEnd={() => {
            userTouching.current = false
          }}
          onTouchCancel={() => {
            userTouching.current = false
          }}
          onPointerDown={(e) => {
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
              userTouching.current = true
            }
          }}
          onPointerUp={() => {
            userTouching.current = false
          }}
          onPointerCancel={() => {
            userTouching.current = false
          }}
        >
          <div className="flex gap-2">
            {FESTIVAL_DAYS.map((day) => {
              const active = selectedDate === day.date
              return (
                <button
                  key={day.date}
                  type="button"
                  ref={(el) => {
                    if (el) btnRefs.current.set(day.date, el)
                    else btnRefs.current.delete(day.date)
                  }}
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
                  <span className="text-lg font-bold leading-none">
                    {day.dayNum}
                  </span>
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
          to="/mapa"
          className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-tejo/90 px-2.5 py-2 text-white shadow-sm transition hover:bg-tejo sm:px-3"
          title={t.mapLink}
        >
          <MapIcon className="h-4 w-4" aria-hidden />
          <span className="text-[0.6rem] font-bold leading-tight tracking-wide">
            {t.mapLinkShort}
          </span>
        </Link>

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
