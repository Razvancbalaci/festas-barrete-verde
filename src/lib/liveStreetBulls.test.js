import { describe, expect, it } from 'vitest'
import {
  haversineMeters,
  openPolygonRing,
  pointAlongRoute,
  pointInPolygon,
  pingPong,
  routeCumulativeMeters,
  routeFromPolygonRing,
  wanderInPolygon,
} from './routeGeom.js'
import {
  bullAnimsForLive,
  findLiveStreetBulls,
  nextLiveBullWakeAt,
  routesForStreetBull,
} from './liveStreetBulls.js'
import {
  ENTRADA_ROUTE,
  LARGADA_RECINTOS,
  LARGADA_STREET_ROUTES,
} from '../data/mapPlaces.js'

describe('routeGeom', () => {
  it('returns endpoints', () => {
    const route = [
      [0, 0],
      [0, 1],
    ]
    expect(pointAlongRoute(route, 0)[1]).toBeCloseTo(0)
    expect(pointAlongRoute(route, 1)[1]).toBeCloseTo(1)
    expect(pointAlongRoute(route, 0.5)[1]).toBeCloseTo(0.5)
  })

  it('pingPongs', () => {
    expect(pingPong(0, 2)).toBeCloseTo(0)
    expect(pingPong(0.25, 2)).toBeCloseTo(0.5)
    expect(pingPong(0.5, 2)).toBeCloseTo(1)
    expect(pingPong(0.75, 2)).toBeCloseTo(0.5)
    expect(pingPong(1, 2)).toBeCloseTo(0)
  })

  it('builds long-axis route from recinto GPS', () => {
    for (const s of LARGADA_STREET_ROUTES) {
      expect(s.route.length).toBeGreaterThanOrEqual(2)
      expect(routeCumulativeMeters(s.route).at(-1)).toBeGreaterThan(20)
    }
  })

  it('Av. 5 de Outubro: smooth, inside, covers long axis', () => {
    const poly = LARGADA_RECINTOS.find((r) => r.id === 'largada-5outubro').positions
    const ring = openPolygonRing(poly)
    const period = 10000
    const phase = 0.37
    const dt = 0.05
    const samples = []
    for (let ms = 0; ms <= period; ms += dt * 1000) {
      const p = wanderInPolygon(poly, ms, period, phase)
      expect(pointInPolygon(p, ring)).toBe(true)
      samples.push(p)
    }
    const speeds = []
    for (let i = 1; i < samples.length; i++) {
      const v = haversineMeters(samples[i - 1], samples[i]) / dt
      speeds.push(v)
      expect(v).toBeLessThan(60)
    }
    speeds.sort((a, b) => a - b)
    const p10 = speeds[Math.floor(speeds.length * 0.1)]
    const p90 = speeds[Math.floor(speeds.length * 0.9)]
    expect(p90 / Math.max(p10, 0.01)).toBeLessThan(1.4)
    expect(p10).toBeGreaterThan(8)
    // Reta central: cobre o eixo longo (aqui ~lng), não a largura toda
    const lngs = samples.map((p) => p[1])
    const polyLngs = ring.map((p) => p[1])
    expect(Math.max(...lngs) - Math.min(...lngs)).toBeGreaterThan(
      (Math.max(...polyLngs) - Math.min(...polyLngs)) * 0.85,
    )
  })

  it('Quebrada: covers nearly the full street length', () => {
    const poly = LARGADA_RECINTOS.find((r) => r.id === 'largada-quebrada').positions
    const ring = openPolygonRing(poly)
    const samples = []
    for (let ms = 0; ms <= 10000; ms += 100) {
      const p = wanderInPolygon(poly, ms, 10000, 0)
      expect(pointInPolygon(p, ring)).toBe(true)
      samples.push(p)
    }
    const lats = samples.map((p) => p[0])
    const lngs = samples.map((p) => p[1])
    const polyLats = ring.map((p) => p[0])
    const polyLngs = ring.map((p) => p[1])
    expect(Math.max(...lats) - Math.min(...lats)).toBeGreaterThan(
      (Math.max(...polyLats) - Math.min(...polyLats)) * 0.85,
    )
    expect(Math.max(...lngs) - Math.min(...lngs)).toBeGreaterThan(
      (Math.max(...polyLngs) - Math.min(...polyLngs)) * 0.85,
    )
  })

  it('all recintos stay inside with smooth motion', () => {
    for (const rec of LARGADA_RECINTOS) {
      const ring = openPolygonRing(rec.positions)
      const period = 10000
      let prev = null
      for (let ms = 0; ms <= period; ms += 100) {
        const p = wanderInPolygon(rec.positions, ms, period, 0)
        expect(pointInPolygon(p, ring)).toBe(true)
        if (prev) {
          expect(haversineMeters(prev, p)).toBeLessThan(15)
        }
        prev = p
      }
    }
  })

  it('oscillates visibly over short periods', async () => {
    const { oscillateProgress } = await import('./routeGeom.js')
    expect(oscillateProgress(0, 16000, 0)).toBeCloseTo(0)
    expect(oscillateProgress(4000, 16000, 0)).toBeCloseTo(0.5)
    expect(oscillateProgress(8000, 16000, 0)).toBeCloseTo(1)
    expect(oscillateProgress(12000, 16000, 0)).toBeCloseTo(0.5)
    expect(oscillateProgress(16000, 16000, 0)).toBeCloseTo(0)
  })
})

describe('liveStreetBulls', () => {
  it('entrada uses a single praça route', () => {
    const routes = routesForStreetBull({
      titulo: '1.ª Entrada de Toiros',
      categoria: 'Toiros',
      local: 'Av. D. Manuel I',
    })
    expect(routes).toHaveLength(1)
    expect(routes[0].route).toBe(ENTRADA_ROUTE)
  })

  it('largada with both streets yields two bulls', () => {
    const routes = routesForStreetBull({
      titulo: '2.ª Largada de Toiros',
      categoria: 'Toiros',
      local: 'Rua José André dos Santos e Av. 5 de Outubro',
    })
    expect(routes.map((r) => r.id).sort()).toEqual([
      'largada-5outubro',
      'largada-quebrada',
    ])
    expect(routes.every((r) => r.mode === 'wander')).toBe(true)
  })

  it('largada only on 5 de Outubro yields one bull', () => {
    const routes = routesForStreetBull({
      titulo: 'Largada de Toiros',
      categoria: 'Toiros',
      local: 'Av. 5 de Outubro',
    })
    expect(routes).toHaveLength(1)
    expect(routes[0].id).toBe('largada-5outubro')
  })

  it('animates one marker per street inside recinto', () => {
    const now = new Date(2026, 7, 8, 21, 15, 0)
    const events = [
      {
        id: '1',
        dia: '2026-08-08',
        hora: '21:00',
        titulo: 'Largada de Toiros',
        categoria: 'Toiros',
        local: 'Rua José André dos Santos e Av. 5 de Outubro',
      },
    ]
    const live = findLiveStreetBulls(events, now)
    expect(live).toHaveLength(1)
    const anims = bullAnimsForLive(live[0], now)
    expect(anims).toHaveLength(2)
    expect(pointInPolygon(anims[0].position, anims[0].polygon)).toBe(true)
    expect(pointInPolygon(anims[1].position, anims[1].polygon)).toBe(true)

    const later = bullAnimsForLive(live[0], new Date(now.getTime() + 3500))
    const moved =
      Math.abs(anims[0].position[0] - later[0].position[0]) +
      Math.abs(anims[0].position[1] - later[0].position[1])
    expect(moved).toBeGreaterThan(1e-5)
  })

  it('entrada only appears for 15 minutes on the map', () => {
    const events = [
      {
        id: '1',
        dia: '2026-08-08',
        hora: '18:00',
        titulo: 'Entrada de Toiros',
        categoria: 'Toiros',
        local: 'Nacional 119',
      },
    ]
    expect(findLiveStreetBulls(events, new Date(2026, 7, 8, 18, 0, 0))).toHaveLength(
      1,
    )
    expect(findLiveStreetBulls(events, new Date(2026, 7, 8, 18, 14, 0))).toHaveLength(
      1,
    )
    expect(findLiveStreetBulls(events, new Date(2026, 7, 8, 18, 16, 0))).toEqual([])
  })

  it('prefers the most recently started bull when windows overlap', () => {
    const events = [
      {
        id: 'entrada',
        dia: '2026-08-08',
        hora: '18:00',
        titulo: 'Entrada de Toiros',
        categoria: 'Toiros',
        local: 'Nacional 119',
      },
      {
        id: 'largada',
        dia: '2026-08-08',
        hora: '18:10',
        titulo: 'Largada de Toiros',
        categoria: 'Toiros',
        local: 'Av. 5 de Outubro',
      },
    ]
    // Entrada corta às 18:10 (início da largada)
    const live = findLiveStreetBulls(events, new Date(2026, 7, 8, 18, 12, 0))
    expect(live).toHaveLength(1)
    expect(live[0].event.id).toBe('largada')
  })

  it('only appears during scheduled largada window', () => {
    const events = [
      {
        id: '1',
        dia: '2026-08-08',
        hora: '21:00',
        titulo: '2.ª Largada de Toiros',
        categoria: 'Toiros',
        local: 'Rua José André dos Santos e Av. 5 de Outubro',
      },
      {
        id: '2',
        dia: '2026-08-08',
        hora: '22:00',
        titulo: 'Recolha de Toiros',
        categoria: 'Toiros',
        local: 'Av. 5 de Outubro',
      },
    ]
    expect(findLiveStreetBulls(events, new Date(2026, 7, 8, 20, 59, 0))).toEqual(
      [],
    )
    expect(findLiveStreetBulls(events, new Date(2026, 7, 8, 21, 0, 0))).toHaveLength(
      1,
    )
    expect(findLiveStreetBulls(events, new Date(2026, 7, 8, 21, 30, 0))).toHaveLength(
      1,
    )
    // Duração Toiros de rua = 60 min
    expect(findLiveStreetBulls(events, new Date(2026, 7, 8, 22, 1, 0))).toEqual([])
    // Recolha não mostra toiro no mapa
    expect(findLiveStreetBulls(events, new Date(2026, 7, 8, 22, 15, 0))).toEqual([])
  })

  it('wakes at next real bull start/end', () => {
    const events = [
      {
        id: '1',
        dia: '2026-08-08',
        hora: '21:00',
        titulo: 'Largada de Toiros',
        categoria: 'Toiros',
        local: 'Av. 5 de Outubro',
      },
    ]
    const before = new Date(2026, 7, 8, 20, 59, 0)
    expect(nextLiveBullWakeAt(before, events)).toBe(
      new Date(2026, 7, 8, 21, 0, 0).getTime(),
    )
  })
})
