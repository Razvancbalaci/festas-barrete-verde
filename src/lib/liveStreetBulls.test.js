import { describe, expect, it } from 'vitest'
import {
  pointAlongRoute,
  pingPong,
  routeCumulativeMeters,
  routeFromPolygonRing,
} from './routeGeom.js'
import {
  bullAnimsForLive,
  findLiveStreetBulls,
  routesForStreetBull,
} from './liveStreetBulls.js'
import { ENTRADA_ROUTE, LARGADA_STREET_ROUTES } from '../data/mapPlaces.js'

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
    const fromPoly = routeFromPolygonRing([
      [0, 0],
      [0, 1],
      [0.1, 1],
      [0.1, 0],
    ])
    expect(fromPoly.length).toBeGreaterThanOrEqual(2)
    expect(routeCumulativeMeters(fromPoly).at(-1)).toBeGreaterThan(0)
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
    expect(anims[0].position).toHaveLength(2)
    expect(anims[1].position).toHaveLength(2)
    expect(anims[0].progress).not.toBeCloseTo(anims[1].progress, 5)
  })
})
