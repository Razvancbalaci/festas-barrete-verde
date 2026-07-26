import { useEffect, useMemo, useRef, useState } from 'react'
import { Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  bullAnimsForLive,
  demoLiveBull,
  findLiveStreetBulls,
} from '../../lib/liveStreetBulls'
import { ENTRADA_ROUTE, LARGADA_STREET_ROUTES } from '../../data/mapPlaces'

/**
 * Pin do toiro: círculo claro + emoji 🐂 (contraste; SVGs abstractos
 * liam-se como serpente a este tamanho).
 */
const BULL_HTML = `<div class="fbv-bull-face" style="width:42px;height:42px;border-radius:50%;background:#FAF8F2;border:2.5px solid #7A1F16;display:flex;align-items:center;justify-content:center;font-size:24px;line-height:1;box-sizing:border-box;box-shadow:0 2px 8px rgba(0,0,0,.35)" aria-hidden="true">🐂</div>`

function makeBullIcon() {
  return L.divIcon({
    className: 'fbv-bull-marker',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    html: BULL_HTML,
  })
}

/** Bump quando o pin muda (força remount dos markers Leaflet). */
const BULL_ICON_REV = 5

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
function AnimatedBullMarkers({ primary, demo, labels }) {
  const map = useMap()
  const markersRef = useRef([])
  const liveRef = useRef(primary)
  const labelsRef = useRef(labels)
  const startMsRef = useRef(null)
  liveRef.current = primary
  labelsRef.current = labels

  // Relógio de animação estável (não reinicia quando o demo recalcula start)
  useEffect(() => {
    if (!primary) {
      startMsRef.current = null
      return
    }
    if (startMsRef.current == null) {
      startMsRef.current = Date.now() - 10 * 60 * 1000
    }
  }, [primary?.event?.id])

  useEffect(() => {
    if (!primary) return undefined

    const markers = []
    const Lbl = labelsRef.current
    const sessionStart = startMsRef.current ?? Date.now() - 10 * 60 * 1000

    const initialLive = {
      ...primary,
      start: new Date(sessionStart),
      end: new Date(sessionStart + 60 * 60 * 1000),
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
      const note = demo ? ` · ${Lbl?.bullDemoNote || 'demo'}` : ''
      marker.bindPopup(
        `<div class="min-w-[10rem] space-y-1 text-sm">
          <strong class="block text-ink">${title}</strong>
          <p class="text-xs text-ink/65">${primary.event?.titulo || ''}${note}</p>
          <p class="text-xs leading-relaxed text-ink/55">${Lbl?.bullSimHint || ''}</p>
        </div>`,
      )
      markers.push(marker)
    })
    markersRef.current = markers

    let raf = 0
    let last = 0
    const tick = (ts) => {
      // ~20 fps chega para parecer fluido e evita trabalho extra
      if (ts - last >= 50) {
        last = ts
        const live = liveRef.current
        if (live) {
          const animLive = {
            ...live,
            start: new Date(sessionStart),
            end: new Date(sessionStart + 60 * 60 * 1000),
          }
          const anims = bullAnimsForLive(animLive, new Date())
          for (let i = 0; i < anims.length; i++) {
            const m = markers[i]
            const pos = anims[i]?.position
            if (m && pos) m.setLatLng(pos)
          }
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
  }, [map, primary?.event?.id, demo, BULL_ICON_REV])

  return null
}

/** Estado live: banner + layer. Teste: /mapa?demoToiro=1 */
export function useLiveStreetBull() {
  const [searchParams] = useSearchParams()
  const demo = searchParams.get('demoToiro') === '1'
  const [events, setEvents] = useState([])
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('eventos')
        .select('id, dia, hora, titulo, local, categoria, bilhetes_url')
        .eq('categoria', 'Toiros')
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

  // Relógio lento só para detectar início/fim de eventos (não para animar)
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  return useMemo(() => {
    const list = demo ? [demoLiveBull(now)] : findLiveStreetBulls(events, now)
    const primary = list[0] || null
    // Snapshot inicial das rotas (polylines); a posição anima no rAF
    const anims = primary ? bullAnimsForLive(primary, now) : []
    return {
      demo,
      primary,
      liveTitle: primary?.event?.titulo || null,
      anims,
      anim: anims[0] || null,
    }
  }, [demo, events, now])
}

export function LiveBullBanner({ labels, liveTitle }) {
  if (!liveTitle) return null
  return (
    <div className="pointer-events-none absolute left-3 right-3 top-14 z-[1000] flex justify-center sm:left-auto sm:right-28 sm:top-3 sm:justify-end">
      <div
        className="pointer-events-auto inline-flex max-w-[min(100%,22rem)] items-center gap-2 rounded-full bg-[#7A1F16] px-3.5 py-2 text-xs font-bold text-white shadow-lg ring-1 ring-white/20"
        role="status"
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center text-base leading-none"
          aria-hidden
        >
          🐂
        </span>
        <span className="min-w-0 truncate">
          {labels?.bullLiveNow || 'A decorrer'}: {liveTitle}
        </span>
      </div>
    </div>
  )
}

/**
 * Rotas + toiros simulados (um por rua nas largadas).
 */
export default function LiveBullLayer({ labels, live }) {
  const { demo, primary, anims = [] } = live || {}
  const hasLive = Boolean(primary) && anims.length > 0

  return (
    <>
      {!hasLive ? (
        <>
          <Polyline
            positions={ENTRADA_ROUTE}
            pathOptions={{
              color: '#C0392B',
              weight: 3,
              opacity: 0.35,
              dashArray: '8 10',
            }}
          >
            <Popup>
              <div className="max-w-[14rem] text-sm">
                <strong className="block text-ink">{labels?.routeEntradaTitle}</strong>
                <p className="mt-1 text-xs text-ink/65">{labels?.routeEntradaHint}</p>
              </div>
            </Popup>
          </Polyline>
          {LARGADA_STREET_ROUTES.map((s) => (
            <Polyline
              key={`idle-${s.id}`}
              positions={s.route}
              pathOptions={{
                color: '#C0392B',
                weight: 3,
                opacity: 0.28,
                dashArray: '6 8',
              }}
            >
              <Popup>
                <div className="max-w-[14rem] text-sm">
                  <strong className="block text-ink">
                    {labels?.[s.nameKey] || s.id}
                  </strong>
                  <p className="mt-1 text-xs text-ink/65">{labels?.bullSimHint}</p>
                </div>
              </Popup>
            </Polyline>
          ))}
        </>
      ) : (
        <>
          {anims.map((anim) => (
            <Polyline
              key={`route-${anim.id}`}
              positions={anim.route}
              pathOptions={{
                color: '#C0392B',
                weight: 5,
                opacity: 0.9,
              }}
            />
          ))}
          <AnimatedBullMarkers primary={primary} demo={demo} labels={labels} />
          <FocusLiveBullOnce position={anims[0]?.position} active />
        </>
      )}
    </>
  )
}
