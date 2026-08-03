import { useEffect, useMemo, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../../lib/supabase'
import {
  findLiveEvents,
  nextLiveEventWakeAt,
} from '../../lib/datetime'
import {
  bullAnimsForLive,
  findLiveStreetBulls,
  isMapLiveBullEvent,
  nextLiveBullWakeAt,
} from '../../lib/liveStreetBulls'
import { bullPinIcon } from '../../lib/mapPinIcon'

function makeBullIcon() {
  return bullPinIcon()
}

/** Bump quando o pin muda (força remount dos markers Leaflet). */
const BULL_ICON_REV = 9

function FocusLiveBullOnce({ position, active }) {
  const map = useMap()
  const focused = useRef(false)
  useEffect(() => {
    if (!active) {
      focused.current = false
      return
    }
    if (!position || focused.current) return
    focused.current = true
    map.panTo(position, { animate: true, duration: 0.8 })
  }, [active, map, position?.[0], position?.[1]])
  return null
}

/**
 * Toiros animados no Leaflet (rAF + setLatLng) — não depende do Marker do react-leaflet.
 */
function AnimatedBullMarkers({ primary, labels }) {
  const map = useMap()
  const markersRef = useRef([])
  const liveRef = useRef(primary)
  const labelsRef = useRef(labels)
  liveRef.current = primary
  labelsRef.current = labels

  useEffect(() => {
    if (!primary) return undefined

    const markers = []
    const Lbl = labelsRef.current
    const animStart = primary.start
    const animEnd = primary.end

    const initialLive = {
      ...primary,
      start: animStart,
      end: animEnd,
    }
    const initial = bullAnimsForLive(initialLive, new Date())

    initial.forEach((anim, i) => {
      const marker = L.marker(anim.position, {
        icon: makeBullIcon(),
        zIndexOffset: 800 + i,
        interactive: true,
        keyboard: false,
      }).addTo(map)
      const title =
        Lbl?.[anim.nameKey] ||
        Lbl?.bullLiveTitle ||
        primary.event?.titulo ||
        ''
      marker.bindPopup(
        `<div class="min-w-[10rem] space-y-1 text-sm">
          <strong class="block text-ink">${title}</strong>
          <p class="text-xs text-ink/65">${primary.event?.titulo || ''}</p>
          <p class="text-xs leading-relaxed text-ink/55">${Lbl?.bullSimHint || ''}</p>
        </div>`,
      )
      markers.push(marker)
    })
    markersRef.current = markers

    let raf = 0
    const tick = () => {
      const live = liveRef.current
      if (live) {
        const animLive = {
          ...live,
          start: animStart,
          end: animEnd,
        }
        const anims = bullAnimsForLive(animLive, new Date())
        for (let i = 0; i < anims.length; i++) {
          const m = markers[i]
          const pos = anims[i]?.position
          if (m && pos) m.setLatLng(pos)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      for (const m of markers) {
        map.removeLayer(m)
      }
      markersRef.current = []
    }
  }, [map, primary?.event?.id, primary?.start?.getTime?.() ?? 0, BULL_ICON_REV])

  return null
}

/** Estado live: banner + layer — só eventos reais do programa. */
export function useLiveStreetBull() {
  const [events, setEvents] = useState([])
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('eventos')
        .select('id, dia, hora, titulo, local, categoria, bilhetes_url')
      if (cancelled) return
      if (error) {
        console.error(error)
        return
      }
      setEvents(data || [])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let timeoutId = 0
    let intervalId = 0
    let cancelled = false

    const tick = () => {
      if (!cancelled) setNow(new Date())
    }

    const armTimeout = () => {
      window.clearTimeout(timeoutId)
      const bullWake = nextLiveBullWakeAt(new Date(), events)
      const eventWake = nextLiveEventWakeAt(events, new Date())
      const candidates = [bullWake, eventWake].filter((t) => t != null)
      if (!candidates.length) return
      const wakeAt = Math.min(...candidates)
      const delay = Math.max(50, wakeAt - Date.now() + 50)
      const slice = Math.min(delay, 30_000)
      timeoutId = window.setTimeout(() => {
        tick()
        armTimeout()
      }, slice)
    }

    tick()
    armTimeout()
    intervalId = window.setInterval(tick, 5_000)

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        tick()
        armTimeout()
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [events])

  return useMemo(() => {
    const bullList = findLiveStreetBulls(events, now)
    const primary = bullList[0] || null
    const anims = primary ? bullAnimsForLive(primary, now) : []

    const liveNow = findLiveEvents(events, now).map((row) => ({
      id: row.event.id,
      title: row.event.titulo,
      categoria: row.event.categoria,
      local: row.event.local || '',
      kind: isMapLiveBullEvent(row.event) ? 'bull' : 'event',
    }))

    return {
      primary,
      liveTitle: primary?.event?.titulo || null,
      liveNow,
      anims,
      anim: anims[0] || null,
    }
  }, [events, now])
}

const LIVE_NOW_PREF_KEY = 'fbv-map-live-now'

function readLiveNowPref() {
  try {
    return localStorage.getItem(LIVE_NOW_PREF_KEY) !== '0'
  } catch {
    return true
  }
}

function writeLiveNowPref(show) {
  try {
    localStorage.setItem(LIVE_NOW_PREF_KEY, show ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function liveNowStyle(item) {
  if (item.kind === 'bull' || item.categoria === 'Toiros') {
    return { bg: '#7A1F16', glyph: '🐂' }
  }
  if (item.categoria === 'Música') {
    return { bg: '#1B6CA8', glyph: '🎤' }
  }
  if (item.categoria === 'Pirotecnia') {
    return { bg: '#C0392B', glyph: '🎆' }
  }
  if (item.categoria === 'Religioso') {
    return { bg: '#5B7C8A', glyph: '⛪' }
  }
  return { bg: '#1B5E3F', glyph: '📍' }
}

/** Banners «a decorrer agora» — painel único com lista + ocultar. */
export function LiveNowBanners({ labels, items }) {
  const list = items || []
  const [show, setShow] = useState(readLiveNowPref)

  if (!list.length) return null

  const prefix = labels?.bullLiveNow || 'A decorrer agora'

  if (!show) {
    return (
      <div className="pointer-events-none absolute left-3 top-16 z-[1000] sm:top-3 sm:left-14">
        <button
          type="button"
          onClick={() => {
            setShow(true)
            writeLiveNowPref(true)
          }}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-md ring-1 ring-barrete/15 backdrop-blur hover:bg-white"
          aria-label={labels?.liveNowShowAria || labels?.liveNowShow}
        >
          <span aria-hidden>🐂</span>
          {labels?.liveNowShow || 'Mostrar a decorrer'}
        </button>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute left-3 top-16 z-[1000] w-[min(calc(100%-1.5rem),20rem)] sm:top-3 sm:left-14">
      <div
        className="pointer-events-auto overflow-hidden rounded-2xl bg-[#1a1a1a]/88 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md"
        role="status"
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-[0.7rem] font-bold uppercase tracking-wide text-white/90">
            {prefix}
          </span>
          <button
            type="button"
            onClick={() => {
              setShow(false)
              writeLiveNowPref(false)
            }}
            className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white/90 hover:bg-white/20"
            aria-label={labels?.liveNowHideAria || labels?.liveNowHide}
            title={labels?.liveNowHide || 'Ocultar'}
          >
            {labels?.liveNowHide || 'Ocultar'}
          </button>
        </div>
        <ul className="divide-y divide-white/10">
          {list.map((item) => {
            const { bg, glyph } = liveNowStyle(item)
            return (
              <li key={item.id} className="flex items-center gap-2.5 px-3 py-2.5">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm leading-none"
                  style={{
                    background: '#FAF8F2',
                    borderColor: bg,
                  }}
                  aria-hidden
                >
                  {glyph}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold leading-snug text-white">
                  {item.title}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/** @deprecated use LiveNowBanners */
export function LiveBullBanner({ labels, liveTitle }) {
  if (!liveTitle) return null
  return (
    <LiveNowBanners
      labels={labels}
      items={[{ id: 'legacy', title: liveTitle, kind: 'bull', categoria: 'Toiros' }]}
    />
  )
}

/**
 * Toiros live nos recintos (sem linhas de percurso — o polígono basta).
 */
export default function LiveBullLayer({ labels, live }) {
  const { primary, anims = [] } = live || {}
  const hasLive = Boolean(primary) && anims.length > 0

  if (!hasLive) return null

  return (
    <>
      <AnimatedBullMarkers primary={primary} labels={labels} />
      <FocusLiveBullOnce position={anims[0]?.position} active />
    </>
  )
}
