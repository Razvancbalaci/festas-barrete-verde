import { describe, expect, it } from 'vitest'
import {
  bizMissingCoords,
  filterAdminBusinesses,
  isBizApproved,
  isBizPending,
  isBizRejected,
} from './adminBusinessFilters'

const rows = [
  { id: '1', nome: 'Tasca A', aprovado: false, rejeitado: false, lat: 1, lng: 2 },
  { id: '2', nome: 'Café B', aprovado: true, rejeitado: false, lat: 1, lng: 2, tipo: 'Café / Bar' },
  { id: '3', nome: 'Loja C', aprovado: true, rejeitado: false, destaque: true },
  { id: '4', nome: 'Bar D', aprovado: false, rejeitado: true, morada: 'Rua X' },
  { id: '5', nome: 'Restaurante E', aprovado: true, rejeitado: false, lat: 'x', lng: null },
]

describe('adminBusinessFilters', () => {
  it('classifies pending / approved / rejected', () => {
    expect(isBizPending(rows[0])).toBe(true)
    expect(isBizApproved(rows[1])).toBe(true)
    expect(isBizRejected(rows[3])).toBe(true)
    expect(isBizPending(rows[3])).toBe(false)
    expect(isBizApproved({ aprovado: true, rejeitado: true })).toBe(false)
  })

  it('detects missing coords (incl. NaN strings)', () => {
    expect(bizMissingCoords(rows[1])).toBe(false)
    expect(bizMissingCoords(rows[2])).toBe(true)
    expect(bizMissingCoords(rows[4])).toBe(true)
    expect(bizMissingCoords(null)).toBe(true)
  })

  it('filters by queue mode', () => {
    expect(filterAdminBusinesses(rows, { filter: 'pending' }).map((n) => n.id)).toEqual([
      '1',
    ])
    expect(filterAdminBusinesses(rows, { filter: 'approved' }).map((n) => n.id)).toEqual([
      '2',
      '3',
      '5',
    ])
    expect(filterAdminBusinesses(rows, { filter: 'rejected' }).map((n) => n.id)).toEqual([
      '4',
    ])
    expect(filterAdminBusinesses(rows, { filter: 'nocoords' }).map((n) => n.id)).toEqual([
      '3',
      '5',
    ])
    expect(filterAdminBusinesses(rows, { filter: 'featured' }).map((n) => n.id)).toEqual([
      '3',
    ])
    expect(filterAdminBusinesses(rows, { filter: 'all' })).toHaveLength(5)
  })

  it('applies text query across nome / morada / tipo', () => {
    expect(
      filterAdminBusinesses(rows, { filter: 'all', query: 'rua' }).map((n) => n.id),
    ).toEqual(['4'])
    expect(
      filterAdminBusinesses(rows, { filter: 'approved', query: 'café' }).map(
        (n) => n.id,
      ),
    ).toEqual(['2'])
    expect(
      filterAdminBusinesses(rows, { filter: 'pending', query: 'zzz' }),
    ).toEqual([])
  })

  it('handles empty / invalid input', () => {
    expect(filterAdminBusinesses(null, { filter: 'pending' })).toEqual([])
    expect(filterAdminBusinesses(undefined)).toEqual([])
  })
})
