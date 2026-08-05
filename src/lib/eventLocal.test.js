import { describe, expect, it } from 'vitest'
import { ENTRADA_ROUTE_LOCAL } from '../data/mapPlaces.js'
import { eventLocalSummary } from './eventLocal.js'

describe('eventLocalSummary', () => {
  it('summarises entrada as first → last street', () => {
    expect(
      eventLocalSummary({
        titulo: '[TEST] Entrada de toiros',
        local: ENTRADA_ROUTE_LOCAL,
      }),
    ).toBe('Av. D. Manuel I → Nacional 119 (Praça de Touros)')
  })

  it('summarises multi-street largada local', () => {
    expect(
      eventLocalSummary({
        titulo: 'Largada',
        local: 'Rua da Quebrada, Rua José André dos Santos',
      }),
    ).toBe('Rua da Quebrada → Rua José André dos Santos')
  })

  it('keeps single street as-is', () => {
    expect(
      eventLocalSummary({
        titulo: 'Largada',
        local: 'Av. 5 de Outubro',
      }),
    ).toBe('Av. 5 de Outubro')
  })
})
