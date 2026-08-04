import { describe, expect, it } from 'vitest'
import { ENTRADA_DEST, ENTRADA_ROUTE } from '../data/mapPlaces.js'
import {
  isEntradaGpsRouteEvent,
  mapsDirectionsFromLatLngs,
  mapsDirectionsUrl,
  mapsPlace,
} from './locations.js'

describe('entrada Maps destination', () => {
  it('Nacional 119 aliases the avenue gate, not the praça centre', () => {
    const gate = `${ENTRADA_DEST[0]},${ENTRADA_DEST[1]}`
    expect(mapsPlace('Nacional 119')).toBe(gate)
    expect(mapsPlace('EN 119')).toBe(gate)
    expect(mapsPlace('N 119')).toBe(gate)
    expect(mapsPlace('Praça de Touros')).not.toBe(gate)
  })
})

describe('isEntradaGpsRouteEvent', () => {
  it('matches entradas and boi da guia', () => {
    expect(isEntradaGpsRouteEvent({ titulo: '1ª Entrada de Touros na Vila' })).toBe(
      true,
    )
    expect(
      isEntradaGpsRouteEvent({
        titulo: 'Prova do Boi da Guia seguida da Arte de Campinagem',
      }),
    ).toBe(true)
    expect(isEntradaGpsRouteEvent({ titulo: '1ª Largada de Touros' })).toBe(false)
  })
})

describe('mapsDirectionsFromLatLngs', () => {
  it('builds walking directions from ENTRADA_ROUTE GPS', () => {
    const url = mapsDirectionsFromLatLngs(ENTRADA_ROUTE)
    const params = new URL(url).searchParams
    expect(params.get('travelmode')).toBe('walking')
    expect(params.get('origin')).toBe(
      `${ENTRADA_ROUTE[0][0]},${ENTRADA_ROUTE[0][1]}`,
    )
    expect(params.get('destination')).toBe(
      `${ENTRADA_DEST[0]},${ENTRADA_DEST[1]}`,
    )
    const waypoints = params.get('waypoints')?.split('|') || []
    expect(waypoints.length).toBeGreaterThan(0)
    expect(waypoints.length).toBeLessThanOrEqual(8)
  })
})

describe('mapsDirectionsUrl Nacional 119', () => {
  it('ends at the entrada gate when last street is Nacional 119', () => {
    const url = mapsDirectionsUrl([
      'Av. D. Manuel I',
      'Av. 5 de Outubro',
      'Nacional 119',
    ])
    const params = new URL(url).searchParams
    expect(params.get('destination')).toBe(
      `${ENTRADA_DEST[0]},${ENTRADA_DEST[1]}`,
    )
  })
})
