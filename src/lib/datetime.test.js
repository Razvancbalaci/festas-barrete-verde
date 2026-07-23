import { describe, expect, it } from 'vitest'
import {
  eventDateTime,
  findNextOrCurrentEvent,
  formatLocalReminderValue,
  localDateIso,
  parseLocalReminderValue,
  timeSortKey,
} from './datetime.js'
import {
  eventMatchesPlace,
  getMapPlace,
  includesTerm,
} from '../data/mapPlaces.js'
import { parseLocations, mapsWalkToUrl } from './locations.js'

describe('localDateIso', () => {
  it('uses local calendar date not UTC', () => {
    // 2026-08-07 00:30 in UTC+1 → still Aug 7 locally
    const d = new Date(2026, 7, 7, 0, 30, 0) // month 7 = August
    expect(localDateIso(d)).toBe('2026-08-07')
  })
})

describe('eventDateTime overnight', () => {
  it('places 01:00 on the next calendar day', () => {
    const d = eventDateTime('2026-08-07', '01:00')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7)
    expect(d.getDate()).toBe(8)
    expect(d.getHours()).toBe(1)
  })

  it('keeps evening times on the same day', () => {
    const d = eventDateTime('2026-08-07', '22:30')
    expect(d.getDate()).toBe(7)
    expect(d.getHours()).toBe(22)
  })

  it('sorts overnight after evening', () => {
    expect(timeSortKey('01:00')).toBeGreaterThan(timeSortKey('23:00'))
  })
})

describe('findNextOrCurrentEvent', () => {
  it('picks overnight event after evening on the same cartaz day', () => {
    const events = [
      { id: 'a', dia: '2026-08-07', hora: '22:00', categoria: 'Institucional', titulo: 'Concerto' },
      { id: 'b', dia: '2026-08-07', hora: '01:30', categoria: 'Música', titulo: 'After' },
    ]
    // 22:00 + 90 min → acabou; ainda antes da 01:30
    const now = new Date(eventDateTime('2026-08-07', '22:00').getTime() + 95 * 60 * 1000)
    const target = findNextOrCurrentEvent(events, now)
    expect(target?.id).toBe('b')
  })
})

describe('local reminder values', () => {
  it('round-trips dia', () => {
    const raw = formatLocalReminderValue('2026-08-07T21:00:00.000Z', '2026-08-07')
    expect(parseLocalReminderValue(raw)).toEqual({
      whenIso: '2026-08-07T21:00:00.000Z',
      dia: '2026-08-07',
    })
  })
})

describe('parseLocations', () => {
  it('splits e O Forcado', () => {
    const parts = parseLocations('Largo João da Horta e O Forcado')
    expect(parts).toEqual(['Largo João da Horta', 'O Forcado'])
  })
})

describe('mapsWalkToUrl', () => {
  it('builds walking directions to lat,lng', () => {
    const url = mapsWalkToUrl(38.75, -8.96)
    expect(url).toContain('travelmode=walking')
    expect(url).toContain(encodeURIComponent('38.75,-8.96'))
  })
})

describe('eventMatchesPlace', () => {
  it('does not match Homenagem ao Forcado to Palco Forcado', () => {
    const place = getMapPlace('forcado')
    expect(
      eventMatchesPlace(
        { titulo: 'Homenagem ao Forcado, ao Campino e ao Salineiro', local: null },
        place
      )
    ).toBe(false)
  })

  it('matches Pavilhão Municipal in local', () => {
    const place = getMapPlace('pavilhao')
    expect(
      eventMatchesPlace(
        {
          titulo: 'Prova de Karting',
          local: 'junto ao Pavilhão Municipal de Alcochete',
        },
        place
      )
    ).toBe(true)
  })

  it('does not match bare Feira to carrosséis pin', () => {
    const place = getMapPlace('feira')
    expect(
      eventMatchesPlace({ titulo: 'A Feira do Toiro', local: 'Praça de Touros' }, place)
    ).toBe(false)
  })

  it('does not attach entrada route streets to Palco S. João', () => {
    const place = getMapPlace('sjoao')
    expect(
      eventMatchesPlace(
        {
          titulo: 'Entrada de Toiros',
          local:
            'Av. D. Manuel I, Rua da Quebrada, Rua José André dos Santos, Rua João de Deus, Largo da Revolução 1910, Largo de S. João, Av. 5 de Outubro, Nacional 119',
          categoria: 'Toiros',
        },
        place
      )
    ).toBe(false)
  })

  it('includesTerm respects word borders', () => {
    expect(includesTerm('homenagem ao forcado', 'o forcado')).toBe(false)
    expect(includesTerm('palco forcado', 'palco forcado')).toBe(true)
  })
})
