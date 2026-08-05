import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isLiveSmokeTest,
  liveSmokeEvents,
  mergeLiveSmokeEvents,
  setLiveSmokeTest,
} from './liveSmokeTest'

vi.mock('./appConfig', () => ({
  isLiveSmokeGateEnabled: vi.fn(() => false),
}))

import { isLiveSmokeGateEnabled } from './appConfig'

describe('liveSmokeTest gate', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(isLiveSmokeGateEnabled).mockReturnValue(false)
  })

  it('is off when server gate is disabled', () => {
    setLiveSmokeTest(true)
    expect(isLiveSmokeTest()).toBe(false)
  })

  it('works when server gate is enabled and local flag is set', () => {
    vi.mocked(isLiveSmokeGateEnabled).mockReturnValue(true)
    setLiveSmokeTest(true)
    expect(isLiveSmokeTest()).toBe(true)
  })
})

describe('mergeLiveSmokeEvents', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(isLiveSmokeGateEnabled).mockReturnValue(true)
    setLiveSmokeTest(true)
  })

  it('returns original events when smoke is off', () => {
    setLiveSmokeTest(false)
    const events = [{ id: 'real-1', titulo: 'Real' }]
    expect(mergeLiveSmokeEvents(events)).toEqual(events)
  })

  it('prepends smoke events and drops id collisions', () => {
    const now = new Date('2026-08-07T12:00:00')
    const smoke = liveSmokeEvents(now)
    const merged = mergeLiveSmokeEvents(
      [
        { id: 'real-1', titulo: 'Real' },
        { id: smoke[0].id, titulo: 'Duplicate id' },
      ],
      now,
    )
    expect(merged[0].titulo).toMatch(/^\[TEST\]/)
    expect(merged.some((e) => e.id === 'real-1')).toBe(true)
    expect(merged.filter((e) => e.id === smoke[0].id)).toHaveLength(1)
  })

  it('builds synthetic events for today with [TEST] prefix', () => {
    const now = new Date('2026-08-07T15:30:00')
    const events = liveSmokeEvents(now)
    expect(events.length).toBeGreaterThanOrEqual(5)
    expect(events.every((e) => e.dia === '2026-08-07')).toBe(true)
    expect(events.every((e) => String(e.titulo).startsWith('[TEST]'))).toBe(
      true,
    )
  })
})
