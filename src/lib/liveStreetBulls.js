import { eventDateTime, eventDurationMinutes } from './datetime'
import { isRouteMapEvent, isStreetBullEvent } from './locations'
import { ENTRADA_ROUTE, LARGADA_STREET_ROUTES } from '../data/mapPlaces'
import { pointAlongRoute, wanderInPolygon } from './routeGeom'

/** Uma volta completa ao eixo do recinto (ms). */
export const BULL_WANDER_MS = 10000
/** Percurso de entrada: uma passagem ao longo da rota, depois reinicia. */
export const BULL_ENTRADA_LOOP_MS = 40000
/** @deprecated use BULL_WANDER_MS */
export const BULL_PINGPONG_MS = BULL_WANDER_MS

/**
 * Eventos que mostram toiro no mapa: entradas e largadas (não recolhas/esperas).
 */
export function isMapLiveBullEvent(event) {
  if (!isStreetBullEvent(event)) return false
  return /entrada|largada|boi da guia/i.test(event?.titulo || '')
}

/**
 * Entradas/largadas actualmente em curso (hora do cartaz → + duração).
 * Fora desse intervalo o toiro não aparece.
 * Ordenados do mais recente para o mais antigo — o mapa anima só o primeiro.
 */
export function findLiveStreetBulls(events, now = new Date()) {
  const live = []
  for (const e of events || []) {
    if (!isMapLiveBullEvent(e)) continue
    const start = eventDateTime(e.dia, e.hora)
    if (Number.isNaN(start.getTime())) continue
    const end = new Date(start.getTime() + eventDurationMinutes(e) * 60 * 1000)
    if (now >= start && now <= end) live.push({ event: e, start, end })
  }
  live.sort((a, b) => b.start.getTime() - a.start.getTime())
  return live
}

function isEntradaLike(event) {
  return (
    isRouteMapEvent(event) || /entrada|boi da guia/i.test(event?.titulo || '')
  )
}

/**
 * Zonas a animar para um evento:
 * - entrada → percurso até à Praça (linha)
 * - largada → um toiro por recinto, a vaguear no polígono GPS
 */
export function routesForStreetBull(event) {
  if (isEntradaLike(event)) {
    return [
      {
        id: 'entrada',
        nameKey: 'routeEntradaTitle',
        route: ENTRADA_ROUTE,
        mode: 'once',
      },
    ]
  }

  const hay = `${event?.local || ''} ${event?.titulo || ''}`
  const matched = LARGADA_STREET_ROUTES.filter((s) => s.match.test(hay))
  const streets = matched.length ? matched : LARGADA_STREET_ROUTES
  return streets.map((s) => ({
    id: s.id,
    nameKey: s.nameKey,
    route: s.route,
    polygon: s.polygon,
    mode: 'wander',
  }))
}

/** @deprecated use routesForStreetBull */
export function routeForStreetBull(event) {
  return routesForStreetBull(event)[0]?.route || ENTRADA_ROUTE
}

/**
 * Uma ou mais animações (um toiro por rua/recinto).
 * Largadas: movimento 2D dentro do polígono; entradas: ao longo da rota.
 */
export function bullAnimsForLive(live, now = new Date()) {
  const { event, start } = live
  const elapsed = Math.max(0, now.getTime() - start.getTime())
  const routes = routesForStreetBull(event)

  return routes.map((r, i) => {
    const phase = (i * 0.37) % 1
    let position
    let progress
    if (r.mode === 'wander' && r.polygon?.length) {
      position = wanderInPolygon(r.polygon, elapsed, BULL_WANDER_MS, phase)
      progress = (elapsed % BULL_WANDER_MS) / BULL_WANDER_MS
    } else {
      progress =
        r.mode === 'once'
          ? (elapsed % BULL_ENTRADA_LOOP_MS) / BULL_ENTRADA_LOOP_MS
          : (elapsed % BULL_WANDER_MS) / BULL_WANDER_MS
      position = pointAlongRoute(r.route, progress)
    }
    return {
      id: r.id,
      nameKey: r.nameKey,
      route: r.route,
      polygon: r.polygon,
      position,
      progress,
      linear: progress,
    }
  })
}

/** @deprecated use bullAnimsForLive */
export function bullProgressOnRoute(live, now = new Date()) {
  return bullAnimsForLive(live, now)[0] || null
}

/**
 * Próximo instante em que o mapa deve reavaliar live (aparecer/desaparecer).
 * @returns {number|null} epoch ms
 */
export function nextLiveBullWakeAt(now, events = []) {
  let next = null
  for (const e of events || []) {
    if (!isMapLiveBullEvent(e)) continue
    const start = eventDateTime(e.dia, e.hora)
    if (Number.isNaN(start.getTime())) continue
    const end = new Date(start.getTime() + eventDurationMinutes(e) * 60 * 1000)
    for (const t of [start.getTime(), end.getTime()]) {
      if (t > now.getTime() && (next == null || t < next)) next = t
    }
  }
  return next
}
