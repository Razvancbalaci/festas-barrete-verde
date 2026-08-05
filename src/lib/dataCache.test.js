import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  cacheEventsForDay,
  getCachedEventsForDay,
  cacheFestivalEvents,
  getCachedFestivalEvents,
  getCachedEventsByIds,
  cacheApprovedBusinesses,
  getCachedApprovedBusinesses,
} from './dataCache.js'

describe('dataCache', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores and reads events by day', () => {
    const events = [{ id: '1', dia: '2026-08-07', titulo: 'A' }]
    cacheEventsForDay('2026-08-07', events)
    expect(getCachedEventsForDay('2026-08-07')).toEqual(events)
    expect(getCachedEventsForDay('2026-08-08')).toBeNull()
  })

  it('stores festival list and resolves by ids', () => {
    cacheFestivalEvents([
      { id: 'a', dia: '2026-08-07' },
      { id: 'b', dia: '2026-08-08' },
    ])
    expect(getCachedFestivalEvents()).toHaveLength(2)
    expect(getCachedEventsByIds(['b']).map((e) => e.id)).toEqual(['b'])
    expect(getCachedEventsForDay('2026-08-07')?.[0]?.id).toBe('a')
  })

  it('stores approved businesses', () => {
    cacheApprovedBusinesses([{ id: 'n1', nome: 'Tasca' }])
    expect(getCachedApprovedBusinesses()?.[0]?.nome).toBe('Tasca')
  })

  it('returns null when cache expired', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    cacheEventsForDay('2026-08-07', [{ id: '1' }])
    Date.now.mockReturnValue(1_000_000 + 15 * 24 * 60 * 60 * 1000)
    expect(getCachedEventsForDay('2026-08-07')).toBeNull()
  })

  it('returns null for corrupt / incomplete cache payloads', () => {
    localStorage.setItem('fbv-cache:v1:eventos:byDay', '{not-json')
    expect(getCachedEventsForDay('2026-08-07')).toBeNull()

    localStorage.setItem(
      'fbv-cache:v1:eventos:byDay',
      JSON.stringify({ data: { '2026-08-07': [{ id: '1' }] } }),
    )
    expect(getCachedEventsForDay('2026-08-07')).toBeNull()
  })

  it('survives write failures (quota)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() =>
      cacheEventsForDay('2026-08-07', [{ id: '1' }]),
    ).not.toThrow()
    spy.mockRestore()
  })

  it('resolves ids from day bag when festival cache is empty', () => {
    cacheEventsForDay('2026-08-07', [{ id: 'x1', dia: '2026-08-07' }])
    cacheEventsForDay('2026-08-08', [{ id: 'x2', dia: '2026-08-08' }])
    expect(getCachedEventsByIds(['x2', 'missing']).map((e) => e.id)).toEqual([
      'x2',
    ])
  })
})
