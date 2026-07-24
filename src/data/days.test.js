import { describe, it, expect } from 'vitest'
import { defaultFestivalDay, FESTIVAL_DAYS, programDayIso } from './days.js'

describe('defaultFestivalDay', () => {
  it('returns today when it is a festival day', () => {
    expect(defaultFestivalDay('2026-08-07')).toBe('2026-08-07')
    expect(defaultFestivalDay('2026-08-08')).toBe('2026-08-08')
    expect(defaultFestivalDay('2026-08-13')).toBe('2026-08-13')
  })

  it('returns first festival day before the event', () => {
    expect(defaultFestivalDay('2026-08-06')).toBe('2026-08-07')
    expect(defaultFestivalDay('2026-07-24')).toBe(FESTIVAL_DAYS[0].date)
  })

  it('returns first festival day after the event', () => {
    expect(defaultFestivalDay('2026-08-14')).toBe('2026-08-07')
  })
})

describe('programDayIso overnight', () => {
  it('keeps Saturday cartaz at 2am Sunday', () => {
    // 9 Aug 2026 02:00 local
    const now = new Date(2026, 7, 9, 2, 0, 0)
    expect(programDayIso(now)).toBe('2026-08-08')
  })

  it('switches to Sunday after 6am', () => {
    const now = new Date(2026, 7, 9, 6, 0, 0)
    expect(programDayIso(now)).toBe('2026-08-09')
  })

  it('uses first festival morning normally', () => {
    const evening = new Date(2026, 7, 7, 22, 0, 0)
    expect(programDayIso(evening)).toBe('2026-08-07')
    const earlyFirst = new Date(2026, 7, 7, 2, 0, 0)
    // 2am on first day: previous day is not festival → stay on day 7
    expect(programDayIso(earlyFirst)).toBe('2026-08-07')
  })

  it('before festival still defaults to first day', () => {
    const now = new Date(2026, 6, 24, 14, 0, 0)
    expect(programDayIso(now)).toBe('2026-08-07')
  })
})
