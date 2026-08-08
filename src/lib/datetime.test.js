import { describe, expect, it } from 'vitest'
import {
  eventDateTime,
  eventDurationMinutes,
  eventEffectiveEnd,
  findLiveEvents,
  findNextOrCurrentEvent,
  formatLocalReminderValue,
  isValidEventTime,
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

describe('isValidEventTime', () => {
  it('accepts HH:MM', () => {
    expect(isValidEventTime('00:00')).toBe(true)
    expect(isValidEventTime('09:05')).toBe(true)
    expect(isValidEventTime('22:30')).toBe(true)
    expect(isValidEventTime('23:59')).toBe(true)
  })

  it('rejects invalid times', () => {
    expect(isValidEventTime('9:05')).toBe(false)
    expect(isValidEventTime('24:00')).toBe(false)
    expect(isValidEventTime('12:60')).toBe(false)
    expect(isValidEventTime('22h30')).toBe(false)
    expect(isValidEventTime('')).toBe(false)
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

  it('prefers the most recently started event when windows overlap', () => {
    const events = [
      {
        id: 'entrada',
        dia: '2026-08-07',
        hora: '18:00',
        categoria: 'Toiros',
        titulo: 'Entrada de Toiros',
      },
      {
        id: 'largada',
        dia: '2026-08-07',
        hora: '18:10',
        categoria: 'Toiros',
        titulo: 'Largada de Toiros',
      },
    ]
    // Entrada = 15 min (até 18:15); largada já começou
    const now = new Date(2026, 7, 7, 18, 12, 0)
    expect(findNextOrCurrentEvent(events, now)?.id).toBe('largada')
  })

  it('ends a long music slot when the next programme item starts', () => {
    const events = [
      {
        id: 'show',
        dia: '2026-08-08',
        hora: '17:00',
        categoria: 'Música',
        titulo: 'Espetáculo com 4xcap',
        local: 'Palco S. João',
      },
      {
        id: 'entrada',
        dia: '2026-08-08',
        hora: '18:00',
        categoria: 'Toiros',
        titulo: '2ª Entrada de Touros na Vila',
      },
    ]
    expect(eventEffectiveEnd(events[0], events).getHours()).toBe(18)
    expect(eventEffectiveEnd(events[0], events).getMinutes()).toBe(0)
    // Ainda no concerto, antes da entrada
    expect(
      findNextOrCurrentEvent(events, new Date(2026, 7, 8, 17, 30, 0))?.id,
    ).toBe('show')
    // À hora da entrada — segue o cartaz
    expect(
      findNextOrCurrentEvent(events, new Date(2026, 7, 8, 18, 0, 0))?.id,
    ).toBe('entrada')
    // Depois da entrada (15 min) — concerto já não «tapa»
    expect(
      findNextOrCurrentEvent(events, new Date(2026, 7, 8, 18, 20, 0))?.id,
    ).not.toBe('show')
  })
})

describe('eventDurationMinutes', () => {
  it('gives entradas a 15-minute window', () => {
    expect(
      eventDurationMinutes({
        categoria: 'Toiros',
        titulo: 'Entrada de Toiros',
      }),
    ).toBe(15)
    expect(
      eventDurationMinutes({
        categoria: 'Toiros',
        titulo: 'Prova do Boi da Guia',
      }),
    ).toBe(15)
  })

  it('keeps street largadas at 60 minutes', () => {
    expect(
      eventDurationMinutes({
        categoria: 'Toiros',
        titulo: 'Largada de Toiros',
      }),
    ).toBe(60)
  })

  it('uses 60 minutes for music', () => {
    expect(
      eventDurationMinutes({
        categoria: 'Música',
        titulo: 'Concerto',
      }),
    ).toBe(60)
  })
})

describe('findLiveEvents', () => {
  const events = [
    {
      id: '1',
      dia: '2026-08-02',
      hora: '19:00',
      titulo: 'Largada de Toiros',
      categoria: 'Toiros',
    },
    {
      id: '2',
      dia: '2026-08-02',
      hora: '19:00',
      titulo: 'Concerto no Salineiro',
      categoria: 'Música',
    },
    {
      id: '3',
      dia: '2026-08-02',
      hora: '21:00',
      titulo: 'Fogos',
      categoria: 'Pirotecnia',
    },
  ]

  it('returns all events still in their duration window', () => {
    const live = findLiveEvents(events, new Date(2026, 7, 2, 19, 30, 0))
    expect(live.map((r) => r.event.id).sort()).toEqual(['1', '2'])
    expect(live).toHaveLength(2)
  })

  it('drops both after 60 min when nothing truncates them', () => {
    expect(findLiveEvents(events, new Date(2026, 7, 2, 20, 1, 0))).toEqual([])
  })

  it('drops entrada after 15 minutes', () => {
    const entrada = [
      {
        id: 'e',
        dia: '2026-08-02',
        hora: '19:00',
        titulo: 'Entrada de Toiros',
        categoria: 'Toiros',
      },
    ]
    expect(findLiveEvents(entrada, new Date(2026, 7, 2, 19, 10, 0))).toHaveLength(
      1,
    )
    expect(findLiveEvents(entrada, new Date(2026, 7, 2, 19, 16, 0))).toEqual([])
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

describe('mapsDriveToUrl', () => {
  it('builds driving directions to lat,lng', async () => {
    const { mapsDriveToUrl } = await import('./locations.js')
    const url = mapsDriveToUrl(38.75, -8.96)
    expect(url).toContain('travelmode=driving')
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
