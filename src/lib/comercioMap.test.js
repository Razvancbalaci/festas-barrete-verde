import { describe, expect, it } from 'vitest'
import {
  negocioHasMapCoords,
  negocioMapPath,
  parseMapComercioParams,
  resolveNegocioFocusLatLng,
} from './comercioMap'

describe('comercioMap', () => {
  it('builds map deep link with encoded id', () => {
    expect(negocioMapPath('abc-123')).toBe(
      '/mapa?comercio=1&negocio=abc-123',
    )
    expect(negocioMapPath('a b/c')).toBe(
      '/mapa?comercio=1&negocio=a%20b%2Fc',
    )
  })

  it('detects usable coordinates', () => {
    expect(negocioHasMapCoords({ lat: 38.7, lng: -8.9 })).toBe(true)
    expect(negocioHasMapCoords({ lat: '38.7', lng: '-8.9' })).toBe(true)
    expect(negocioHasMapCoords({ lat: null, lng: -8.9 })).toBe(false)
    expect(negocioHasMapCoords({})).toBe(false)
  })

  it('parses comercio / negocio query params', () => {
    expect(
      parseMapComercioParams(new URLSearchParams('comercio=1')),
    ).toEqual({ showCommerce: true, negocioId: null })
    expect(
      parseMapComercioParams(new URLSearchParams('comercio=true')),
    ).toEqual({ showCommerce: true, negocioId: null })
    expect(
      parseMapComercioParams(new URLSearchParams('negocio=xyz')),
    ).toEqual({ showCommerce: true, negocioId: 'xyz' })
    expect(parseMapComercioParams(new URLSearchParams(''))).toEqual({
      showCommerce: false,
      negocioId: null,
    })
  })

  it('resolves focus lat/lng for ?negocio= deep link', () => {
    const rows = [
      { id: 'a', lat: 38.75, lng: -8.96 },
      { id: 'b', lat: null, lng: -8.96 },
    ]
    expect(resolveNegocioFocusLatLng(rows, 'a')).toEqual([38.75, -8.96])
    expect(resolveNegocioFocusLatLng(rows, 'b')).toBeNull()
    expect(resolveNegocioFocusLatLng(rows, 'missing')).toBeNull()
    expect(resolveNegocioFocusLatLng([], 'a')).toBeNull()
    expect(resolveNegocioFocusLatLng(rows, null)).toBeNull()
  })
})
