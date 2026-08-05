import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { mergeLiveSmokeEvents } from '../../lib/liveSmokeTest'
import { eventLocalSummary } from '../../lib/eventLocal'
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
        setEvents([])
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
      const merged = mergeLiveSmokeEvents(events, new Date())
      const bullWake = nextLiveBullWakeAt(new Date(), merged)
      const eventWake = nextLiveEventWakeAt(merged, new Date())
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
    const merged = mergeLiveSmokeEvents(events, now)
    const bullList = findLiveStreetBulls(merged, now)
    const primary = bullList[0] || null
    const anims = primary ? bullAnimsForLive(primary, now) : []

    const liveNow = findLiveEvents(merged, now).map((row) => ({
      id: row.event.id,
      dia: row.event.dia,
      titulo: row.event.titulo,
      title: row.event.titulo,
      categoria: row.event.categoria,
      local: row.event.local || '',
      kind: isMapLiveBullEvent(row.event) ? 'bull' : 'event',
    }))

    return {
      liveBulls: bullList,
      primary: bullList[0] || null,
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

const MOBILE_PREVIEW_MAX = 2
const MOBILE_LIST_MAX_H = 'max-h-[min(42vh,15rem)]'

function liveNowCountLabel(labels, count) {
  const tpl = labels?.liveNowCount || '{n} a decorrer'
  return tpl.replace('{n}', String(count))
}

function liveNowMoreLabel(labels, count) {
  const tpl = labels?.liveNowMore || '+{n} mais'
  return tpl.replace('{n}', String(count))
}

function LiveNowRow({ item, compact = false }) {
  const { bg, glyph } = liveNowStyle(item)
  const href =
    item.id && item.dia
      ? `/?dia=${encodeURIComponent(item.dia)}&evento=${encodeURIComponent(item.id)}`
      : item.id
        ? `/?evento=${encodeURIComponent(item.id)}`
        : null
  const rowClass = `flex w-full items-center gap-2 text-left transition hover:bg-white/10 ${
    compact ? 'px-2.5 py-1.5' : 'gap-2.5 px-3 py-2.5'
  }`
  const inner = (
    <>
      <span
        className={`flex shrink-0 items-center justify-center rounded-full border-2 leading-none ${
          compact ? 'h-6 w-6 text-xs' : 'h-8 w-8 text-sm'
        }`}
        style={{
          background: '#FAF8F2',
          borderColor: bg,
        }}
        aria-hidden
      >
        {glyph}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate font-semibold leading-snug text-white ${
            compact ? 'text-[0.7rem]' : 'text-xs'
          }`}
        >
          {item.title}
        </span>
        {!compact && (item.local || item.kind === 'bull') ? (
          <span className="mt-0.5 block truncate text-[0.65rem] text-white/65">
            {eventLocalSummary(item)}
          </span>
        ) : null}
      </span>
    </>
  )
  if (href) {
    return (
      <Link to={href} className={rowClass}>
        {inner}
      </Link>
    )
  }
  return <div className={rowClass}>{inner}</div>
}

/** Banners «a decorrer agora» — pill compacto no telemóvel + lista no desktop. */
export function LiveNowBanners({ labels, items }) {
  const list = items || []
  const [show, setShow] = useState(readLiveNowPref)
  const [mobileView, setMobileView] = useState('collapsed')

  if (!list.length) return null

  const prefix = labels?.bullLiveNow || 'A decorrer agora'
  const count = list.length
  const previewItems = list.slice(0, MOBILE_PREVIEW_MAX)
  const hiddenCount = Math.max(0, count - MOBILE_PREVIEW_MAX)

  function closePanel() {
    setShow(false)
    setMobileView('collapsed')
    writeLiveNowPref(false)
  }

  if (!show) {
    return (
      <div
        data-testid="live-now-mobile"
        className="pointer-events-none absolute left-3 top-3 z-[1000] sm:left-14"
      >
        <button
          type="button"
          onClick={() => {
            setShow(true)
            setMobileView('preview')
            writeLiveNowPref(true)
          }}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-md ring-1 ring-barrete/15 backdrop-blur hover:bg-white"
          aria-label={labels?.liveNowShowAria || labels?.liveNowShow}
        >
          <span aria-hidden>🐂</span>
          {liveNowCountLabel(labels, count)}
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Telefone: pill → pré-visualização → lista completa */}
      <div
        data-testid="live-now-mobile"
        className="pointer-events-none absolute left-3 top-3 z-[1000] sm:hidden"
      >
        {mobileView === 'collapsed' ? (
          <button
            type="button"
            onClick={() => setMobileView('preview')}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-[#1a1a1a]/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg ring-1 ring-white/15 backdrop-blur"
            aria-expanded="false"
            aria-label={prefix}
          >
            <span aria-hidden>🐂</span>
            {liveNowCountLabel(labels, count)}
          </button>
        ) : (
          <div
            className="pointer-events-auto w-[min(calc(100vw-5.5rem),16rem)] overflow-hidden rounded-2xl bg-[#1a1a1a]/90 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md"
            role="status"
          >
            <div className="flex items-center gap-2 border-b border-white/10 px-2.5 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[0.65rem] font-bold uppercase tracking-wide text-white/90">
                {prefix}
              </span>
              <button
                type="button"
                onClick={closePanel}
                className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white/90"
                aria-label={labels?.liveNowHideAria || labels?.liveNowHide}
              >
                {labels?.liveNowHide || 'Ocultar'}
              </button>
            </div>
            <ul
              className={`divide-y divide-white/10 overflow-y-auto ${
                mobileView === 'full' ? MOBILE_LIST_MAX_H : ''
              }`}
            >
              {(mobileView === 'full' ? list : previewItems).map((item) => (
                <li key={item.id}>
                  <LiveNowRow item={item} compact />
                </li>
              ))}
            </ul>
            {mobileView === 'preview' && hiddenCount > 0 ? (
              <button
                type="button"
                onClick={() => setMobileView('full')}
                className="w-full border-t border-white/10 px-2.5 py-2 text-center text-[0.7rem] font-semibold text-dourado hover:bg-white/5"
              >
                {liveNowMoreLabel(labels, hiddenCount)}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Desktop: lista completa */}
      <div
        data-testid="live-now-desktop"
        className="pointer-events-none absolute left-14 top-3 z-[1000] hidden w-[min(calc(100%-1.5rem),20rem)] sm:block"
      >
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
              onClick={closePanel}
              className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white/90 hover:bg-white/20"
              aria-label={labels?.liveNowHideAria || labels?.liveNowHide}
              title={labels?.liveNowHide || 'Ocultar'}
            >
              {labels?.liveNowHide || 'Ocultar'}
            </button>
          </div>
          <ul className="divide-y divide-white/10">
            {list.map((item) => (
              <li key={item.id}>
                <LiveNowRow item={item} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
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
  const liveBulls =
    live?.liveBulls?.length > 0
      ? live.liveBulls
      : live?.primary
        ? [live.primary]
        : []
  const hasLive = liveBulls.length > 0

  if (!hasLive) return null

  return (
    <>
      {liveBulls.map((entry) => (
        <AnimatedBullMarkers
          key={`${entry.event.id}-${entry.start.getTime()}`}
          primary={entry}
          labels={labels}
        />
      ))}
      <FocusLiveBullOnce position={live?.anims?.[0]?.position} active />
    </>
  )
}
