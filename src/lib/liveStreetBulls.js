import { eventDateTime, eventDurationMinutes, localDateIso } from './datetime'
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
 * Fora desse intervalo o toiro não aparece (excepto ?demoToiro=1).
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
  live.sort((a, b) => a.start - b.start)
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
 * Query demo (`demoToiro` / `demoLive`):
 * - `1` → sempre visível (dev)
 * - `18:49-18:51` → janela no dia de hoje (aparecer / desaparecer à hora)
 */
export function parseDemoToiroParam(raw) {
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  if (s === '1' || /^true$/i.test(s)) return { mode: 'always' }
  const m = s.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/)
  if (!m) return null
  const pad = (h) => {
    const [a, b] = h.split(':')
    return `${String(a).padStart(2, '0')}:${b}`
  }
  return { mode: 'window', startHora: pad(m[1]), endHora: pad(m[2]) }
}

/** Alias — mesma sintaxe para ?demoLive=… */
export const parseDemoLiveParam = parseDemoToiroParam

function demoEvent(dia, hora) {
  return {
    id: 'demo-largada',
    dia,
    hora,
    titulo: 'Largada de Toiros (demo)',
    local: 'Rua José André dos Santos e Av. 5 de Outubro',
    categoria: 'Toiros',
  }
}

/** Eventos falsos para testar banners empilhados (?demoLive=…). */
const DEMO_LIVE_CATALOG = [
  {
    id: 'demo-musica',
    titulo: 'Concerto no Salineiro (demo)',
    local: 'Palco Salineiro',
    categoria: 'Música',
  },
  {
    id: 'demo-feira',
    titulo: 'Abertura da Feira (demo)',
    local: 'Feira dos Carrosséis',
    categoria: 'Institucional',
  },
  {
    id: 'demo-religioso',
    titulo: 'Procissão (demo)',
    local: 'Igreja Matriz',
    categoria: 'Religioso',
  },
]

/**
 * Itens de banner para ?demoLive=1 ou ?demoLive=HH:MM-HH:MM.
 * @returns {Array<{ id, title, categoria, local, kind, demo }>}
 */
export function demoLiveNowItems(now, schedule) {
  if (!schedule) return []
  let start
  let end
  let dia
  let hora
  if (schedule.mode === 'always') {
    start = new Date(now.getTime() - 10 * 60 * 1000)
    end = new Date(now.getTime() + 50 * 60 * 1000)
    dia = localDateIso(now)
    hora = '21:00'
  } else {
    const bounds = demoWindowBounds(now, schedule)
    if (!bounds) return []
    if (now < bounds.start || now >= bounds.end) return []
    ;({ dia, start, end } = bounds)
    hora = schedule.startHora
  }
  return DEMO_LIVE_CATALOG.map((e) => ({
    id: e.id,
    title: e.titulo,
    categoria: e.categoria,
    local: e.local,
    kind: 'event',
    demo: true,
    start,
    end,
    event: { ...e, dia, hora },
  }))
}

/** Sessão demo sempre activa (?demoToiro=1). */
export function demoLiveBull(now = new Date()) {
  const start = new Date(now.getTime() - 10 * 60 * 1000)
  const end = new Date(now.getTime() + 50 * 60 * 1000)
  return {
    event: demoEvent(localDateIso(now), '21:00'),
    start,
    end,
  }
}

/**
 * Lista live para demo (0 ou 1 sessão).
 * Em modo `window`, só entre startHora e endHora do dia civil actual.
 */
export function demoLiveBulls(now, schedule) {
  if (!schedule) return []
  if (schedule.mode === 'always') return [demoLiveBull(now)]

  const bounds = demoWindowBounds(now, schedule)
  if (!bounds) return []
  const { dia, start, end } = bounds
  if (now < start || now >= end) return []
  return [{ event: demoEvent(dia, schedule.startHora), start, end }]
}

/** Início/fim da janela demo no dia civil de `now`. */
export function demoWindowBounds(now, schedule) {
  if (!schedule || schedule.mode !== 'window') return null
  const dia = localDateIso(now)
  const start = eventDateTime(dia, schedule.startHora)
  let end = eventDateTime(dia, schedule.endHora)
  if (end.getTime() <= start.getTime()) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
  }
  return { dia, start, end }
}

/**
 * Próximo instante em que o mapa deve reavaliar live (aparecer/desaparecer).
 * @returns {number|null} epoch ms
 */
export function nextLiveBullWakeAt(now, demoSchedule, events = []) {
  if (demoSchedule?.mode === 'always') return null

  if (demoSchedule?.mode === 'window') {
    const bounds = demoWindowBounds(now, demoSchedule)
    if (!bounds) return null
    const { start, end } = bounds
    if (now < start) return start.getTime()
    if (now < end) return end.getTime()
    // Amanhã à mesma hora de início
    return start.getTime() + 24 * 60 * 60 * 1000
  }

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
