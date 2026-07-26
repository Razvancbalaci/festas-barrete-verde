import { eventDateTime, eventDurationMinutes } from './datetime'
import { isRouteMapEvent, isStreetBullEvent } from './locations'
import { ENTRADA_ROUTE, LARGADA_STREET_ROUTES } from '../data/mapPlaces'
import { pointAlongRoute, oscillateProgress } from './routeGeom'

/** Duração de uma ida-e-volta completa no recinto (ms) — movimento bem visível. */
export const BULL_PINGPONG_MS = 10000
/** Percurso de entrada: uma passagem ao longo da rota, depois reinicia. */
export const BULL_ENTRADA_LOOP_MS = 40000

/**
 * Eventos de toiros de rua actualmente em curso.
 */
export function findLiveStreetBulls(events, now = new Date()) {
  const live = []
  for (const e of events || []) {
    if (!isStreetBullEvent(e)) continue
    const start = eventDateTime(e.dia, e.hora)
    if (Number.isNaN(start.getTime())) continue
    const end = new Date(start.getTime() + eventDurationMinutes(e) * 60 * 1000)
    if (now >= start && now <= end) live.push({ event: e, start, end })
  }
  live.sort((a, b) => a.start - b.start)
  return live
}

function isEntradaLike(event) {
  return (
    isRouteMapEvent(event) || /entrada|boi da guia/i.test(event?.titulo || '')
  )
}

/**
 * Rotas a animar para um evento:
 * - entrada → um percurso até à Praça
 * - largada → uma rota por rua mencionada; se o cartaz cita ambas (ou nenhuma), as duas
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
    mode: 'pingpong',
  }))
}

/** @deprecated use routesForStreetBull */
export function routeForStreetBull(event) {
  return routesForStreetBull(event)[0]?.route || ENTRADA_ROUTE
}

/**
 * Uma ou mais animações (um toiro por rua/recinto).
 * Movimento por tempo de relógio (ciclo ~16s ida-volta), não pela duração do evento.
 */
export function bullAnimsForLive(live, now = new Date()) {
  const { event, start } = live
  const elapsed = Math.max(0, now.getTime() - start.getTime())
  const routes = routesForStreetBull(event)

  return routes.map((r, i) => {
    const phase = (i * 0.37) % 1
    const t =
      r.mode === 'once'
        ? (elapsed % BULL_ENTRADA_LOOP_MS) / BULL_ENTRADA_LOOP_MS
        : oscillateProgress(elapsed, BULL_PINGPONG_MS, phase)
    return {
      id: r.id,
      nameKey: r.nameKey,
      route: r.route,
      position: pointAlongRoute(r.route, t),
      progress: t,
      linear: t,
    }
  })
}

/** @deprecated use bullAnimsForLive */
export function bullProgressOnRoute(live, now = new Date()) {
  return bullAnimsForLive(live, now)[0] || null
}

/** Sessão demo para testar fora das festas (?demoToiro=1). */
export function demoLiveBull(now = new Date()) {
  const start = new Date(now.getTime() - 10 * 60 * 1000)
  const end = new Date(now.getTime() + 50 * 60 * 1000)
  const event = {
    id: 'demo-largada',
    dia: '2026-08-08',
    hora: '21:00',
    titulo: 'Largada de Toiros (demo)',
    local: 'Rua José André dos Santos e Av. 5 de Outubro',
    categoria: 'Toiros',
  }
  return { event, start, end }
}
