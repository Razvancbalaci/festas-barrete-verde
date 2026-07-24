import { describe, expect, it } from 'vitest'
import { eventDateTime } from './datetime.js'
import {
  AUTO_ALERT_OFFSETS,
  alertFireTime,
  buildAutoAlertJobs,
  isPalcoSJoaoShow,
  toScheduleRow,
} from './autoAlerts.js'
import { isCorridaEvent, isStreetBullEvent } from './locations.js'

function minutesBetween(isoLater, isoEarlier) {
  return (new Date(isoLater).getTime() - new Date(isoEarlier).getTime()) / 60000
}

describe('isPalcoSJoaoShow', () => {
  it('matches stage local only', () => {
    expect(isPalcoSJoaoShow({ local: 'Palco S. João' })).toBe(true)
    expect(isPalcoSJoaoShow({ local: 'Palco São João' })).toBe(true)
    expect(isPalcoSJoaoShow({ local: 'Palco S.João' })).toBe(true)
    expect(
      isPalcoSJoaoShow({
        local:
          'Av. D. Manuel I, Largo de S. João, Av. 5 de Outubro e Nacional 119',
      })
    ).toBe(false)
  })
})

describe('alertFireTime', () => {
  const start = new Date('2026-08-07T18:30:00')

  it('fires exactly N minutes before start', () => {
    const when = alertFireTime(start, 15, new Date('2026-08-01T12:00:00'))
    expect(when.toISOString()).toBe(new Date('2026-08-07T18:15:00').toISOString())
  })

  it('returns null if alert time already passed', () => {
    expect(alertFireTime(start, 15, new Date('2026-08-07T18:20:00'))).toBeNull()
  })

  it('rejects invalid offsets', () => {
    expect(alertFireTime(start, 0, new Date('2026-08-01'))).toBeNull()
    expect(alertFireTime(start, -15, new Date('2026-08-01'))).toBeNull()
    expect(alertFireTime(start, 24 * 60 + 1, new Date('2026-08-01'))).toBeNull()
  })

  it('never returns a time after the event start', () => {
    const when = alertFireTime(start, 60, new Date('2026-08-01'))
    expect(when.getTime()).toBeLessThan(start.getTime())
  })
})

describe('buildAutoAlertJobs — timing precision', () => {
  const now = new Date('2026-08-01T12:00:00')

  it('street bull: exactly 15 minutes before event start', () => {
    const event = {
      id: 'largada-1',
      dia: '2026-08-07',
      hora: '18:30',
      titulo: '1ª Largada de Touros',
      categoria: 'Toiros',
    }
    const start = eventDateTime(event.dia, event.hora)
    const jobs = buildAutoAlertJobs([event], now)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].dedupe_key).toBe('auto:street:largada-1:15')
    expect(minutesBetween(start.toISOString(), jobs[0].scheduled_for)).toBe(15)
    expect(jobs[0]._minutes_before).toBe(15)
  })

  it('corrida: exactly 60 minutes before, never 15', () => {
    const event = {
      id: 'corrida-1',
      dia: '2026-08-07',
      hora: '22:00',
      titulo: 'Corrida de Touros - Mano a Mano',
      local: 'Praça de Touros de Alcochete',
      categoria: 'Toiros',
      bilhetes_url: 'https://example.com/bilhetes',
    }
    const start = eventDateTime(event.dia, event.hora)
    const jobs = buildAutoAlertJobs([event], now)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].dedupe_key).toBe('auto:corrida:corrida-1:60')
    expect(minutesBetween(start.toISOString(), jobs[0].scheduled_for)).toBe(60)
    expect(jobs.some((j) => j.dedupe_key.includes(':15'))).toBe(false)
  })

  it('palco S. João: exactly 15 minutes before', () => {
    const event = {
      id: 'sjoao-1',
      dia: '2026-08-10',
      hora: '22:00',
      titulo: 'Fernando Correia Marques',
      local: 'Palco S. João',
      categoria: 'Música',
    }
    const start = eventDateTime(event.dia, event.hora)
    const jobs = buildAutoAlertJobs([event], now)
    expect(jobs).toHaveLength(1)
    expect(minutesBetween(start.toISOString(), jobs[0].scheduled_for)).toBe(15)
  })

  it('overnight largada (01:00 cartaz): alert on correct calendar night', () => {
    // 01:00 do dia 7 no cartaz = madrugada de 8 → alerta 00:45 do dia 8
    const event = {
      id: 'madrugada',
      dia: '2026-08-07',
      hora: '01:00',
      titulo: '2ª Largada de Touros',
      categoria: 'Toiros',
    }
    const start = eventDateTime(event.dia, event.hora)
    expect(start.getDate()).toBe(8)
    expect(start.getHours()).toBe(1)

    const jobs = buildAutoAlertJobs([event], now)
    expect(jobs).toHaveLength(1)
    const fire = new Date(jobs[0].scheduled_for)
    expect(fire.getDate()).toBe(8)
    expect(fire.getHours()).toBe(0)
    expect(fire.getMinutes()).toBe(45)
    expect(minutesBetween(start.toISOString(), jobs[0].scheduled_for)).toBe(15)
  })
})

describe('buildAutoAlertJobs — classification safety', () => {
  const now = new Date('2026-08-01T12:00:00')

  it('corrida is NOT also scheduled as street bull', () => {
    const event = {
      id: 'c1',
      dia: '2026-08-11',
      hora: '22:00',
      titulo: 'Corrida de Touros - Confronto',
      categoria: 'Toiros',
      bilhetes_url: 'https://x.com',
    }
    expect(isCorridaEvent(event)).toBe(true)
    expect(isStreetBullEvent(event)).toBe(false)
    const jobs = buildAutoAlertJobs([event], now)
    expect(jobs.map((j) => j.dedupe_key)).toEqual(['auto:corrida:c1:60'])
  })

  it('entrada route does NOT get S. João stage alert', () => {
    const event = {
      id: 'ent1',
      dia: '2026-08-07',
      hora: '18:00',
      titulo: '1ª Entrada de Touros na Vila',
      local:
        'Av. D. Manuel I, Rua da Quebrada, Largo de S. João, Av. 5 de Outubro e Nacional 119',
      categoria: 'Toiros',
    }
    expect(isPalcoSJoaoShow(event)).toBe(false)
    const jobs = buildAutoAlertJobs([event], now)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].dedupe_key).toBe('auto:street:ent1:15')
  })

  it('music on Salineiro gets no auto alerts', () => {
    const jobs = buildAutoAlertJobs(
      [
        {
          id: 'sal',
          dia: '2026-08-08',
          hora: '23:00',
          titulo: 'Animação Musical',
          local: 'Palco Salineiro',
          categoria: 'Música',
        },
      ],
      now
    )
    expect(jobs).toHaveLength(0)
  })

  it('folklore / infantil / religioso without rules get nothing', () => {
    const jobs = buildAutoAlertJobs(
      [
        {
          id: 'f1',
          dia: '2026-08-07',
          hora: '21:00',
          titulo: 'Rancho',
          local: 'Palco Coreto',
          categoria: 'Folclore',
        },
        {
          id: 'r1',
          dia: '2026-08-09',
          hora: '22:00',
          titulo: 'Procissão',
          local: null,
          categoria: 'Religioso',
        },
      ],
      now
    )
    expect(jobs).toHaveLength(0)
  })

  it('vacas count as street bulls (15 min)', () => {
    const jobs = buildAutoAlertJobs(
      [
        {
          id: 'v1',
          dia: '2026-08-10',
          hora: '18:00',
          titulo: 'Largada de vacas pelas ruas da Vila',
          categoria: 'Toiros',
        },
      ],
      now
    )
    expect(jobs).toHaveLength(1)
    expect(jobs[0]._minutes_before).toBe(15)
  })
})

describe('buildAutoAlertJobs — no early / random / duplicate sends', () => {
  it('never schedules more than the configured minutes before start', () => {
    const now = new Date('2026-07-01T00:00:00')
    const events = [
      {
        id: 'a',
        dia: '2026-08-07',
        hora: '18:00',
        titulo: 'Entrada',
        categoria: 'Toiros',
      },
      {
        id: 'b',
        dia: '2026-08-09',
        hora: '18:00',
        titulo: 'Corrida de Touros',
        categoria: 'Toiros',
        bilhetes_url: 'https://x.com',
      },
      {
        id: 'c',
        dia: '2026-08-12',
        hora: '22:30',
        titulo: 'TOY',
        local: 'Palco S. João',
        categoria: 'Música',
      },
    ]
    const jobs = buildAutoAlertJobs(events, now)
    for (const job of jobs) {
      const start = new Date(job._event_start)
      const fire = new Date(job.scheduled_for)
      const mins = minutesBetween(start.toISOString(), fire.toISOString())
      expect(mins).toBe(job._minutes_before)
      expect([15, 60]).toContain(mins)
      // Nunca dias antes: no máximo 60 minutos
      expect(mins).toBeLessThanOrEqual(60)
      expect(fire.getTime()).toBeLessThan(start.getTime())
      expect(fire.getTime()).toBeGreaterThan(now.getTime())
    }
  })

  it('skips alerts whose fire time already passed (even if event is later)', () => {
    // Evento às 18:30; agora 18:20 → alerta 18:15 já passou
    const jobs = buildAutoAlertJobs(
      [
        {
          id: 'late',
          dia: '2026-08-07',
          hora: '18:30',
          titulo: 'Largada',
          categoria: 'Toiros',
        },
      ],
      new Date('2026-08-07T18:20:00')
    )
    expect(jobs).toHaveLength(0)
  })

  it('skips incomplete events', () => {
    expect(
      buildAutoAlertJobs(
        [
          { id: 'x', hora: '18:00', titulo: 'Largada', categoria: 'Toiros' },
          { dia: '2026-08-07', hora: '18:00', titulo: 'Largada', categoria: 'Toiros' },
          null,
        ],
        new Date('2026-08-01')
      )
    ).toHaveLength(0)
  })

  it('dedupe keys are unique per event+kind', () => {
    const jobs = buildAutoAlertJobs(
      [
        {
          id: 'same',
          dia: '2026-08-07',
          hora: '18:00',
          titulo: 'Entrada',
          categoria: 'Toiros',
        },
        {
          id: 'same',
          dia: '2026-08-07',
          hora: '18:00',
          titulo: 'Entrada',
          categoria: 'Toiros',
        },
      ],
      new Date('2026-08-01')
    )
    const keys = jobs.map((j) => j.dedupe_key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('toScheduleRow strips internal fields', () => {
    const [job] = buildAutoAlertJobs(
      [
        {
          id: 'z',
          dia: '2026-08-07',
          hora: '19:00',
          titulo: 'Largada',
          categoria: 'Toiros',
        },
      ],
      new Date('2026-08-01')
    )
    const row = toScheduleRow(job)
    expect(row).toEqual({
      dedupe_key: job.dedupe_key,
      title: job.title,
      body: job.body,
      scheduled_for: job.scheduled_for,
      status: 'pending',
    })
    expect(row._event_start).toBeUndefined()
  })

  it('offsets constants match product rules', () => {
    expect(AUTO_ALERT_OFFSETS).toEqual({
      streetMinutes: 15,
      corridaMinutes: 60,
      sjoaoMinutes: 15,
    })
  })
})

describe('festival programme sample batch', () => {
  const now = new Date('2026-08-01T10:00:00')
  const sample = [
    {
      id: '1',
      dia: '2026-08-07',
      hora: '18:00',
      titulo: '1ª Entrada de Touros na Vila',
      categoria: 'Toiros',
      local: 'Av. D. Manuel I, Largo de S. João, Nacional 119',
    },
    {
      id: '2',
      dia: '2026-08-07',
      hora: '22:00',
      titulo: 'Corrida de Touros - Mano a Mano',
      categoria: 'Toiros',
      bilhetes_url: 'https://tickets',
    },
    {
      id: '3',
      dia: '2026-08-07',
      hora: '22:30',
      titulo: 'Folclore',
      local: 'Palco S. João',
      categoria: 'Folclore',
    },
    {
      id: '4',
      dia: '2026-08-07',
      hora: '01:00',
      titulo: '2ª Largada de Touros',
      categoria: 'Toiros',
    },
    {
      id: '5',
      dia: '2026-08-08',
      hora: '23:00',
      titulo: 'Fábio',
      local: 'Palco Salineiro',
      categoria: 'Música',
    },
  ]

  it('only emits expected jobs with exact offsets', () => {
    const jobs = buildAutoAlertJobs(sample, now)
    const byKey = Object.fromEntries(jobs.map((j) => [j.dedupe_key, j]))

    expect(Object.keys(byKey).sort()).toEqual(
      [
        'auto:corrida:2:60',
        'auto:sjoao:3:15',
        'auto:street:1:15',
        'auto:street:4:15',
      ].sort()
    )

    for (const job of jobs) {
      expect(
        minutesBetween(job._event_start, job.scheduled_for)
      ).toBe(job._minutes_before)
    }

    // Entrada: 18:00 → 17:45 same day
    expect(new Date(byKey['auto:street:1:15'].scheduled_for).getHours()).toBe(17)
    expect(new Date(byKey['auto:street:1:15'].scheduled_for).getMinutes()).toBe(45)

    // Corrida: 22:00 → 21:00
    expect(new Date(byKey['auto:corrida:2:60'].scheduled_for).getHours()).toBe(21)
    expect(new Date(byKey['auto:corrida:2:60'].scheduled_for).getMinutes()).toBe(0)

    // Madrugada largada: alerta 00:45 do dia seguinte
    const madrugada = new Date(byKey['auto:street:4:15'].scheduled_for)
    expect(madrugada.getDate()).toBe(8)
    expect(madrugada.getHours()).toBe(0)
    expect(madrugada.getMinutes()).toBe(45)
  })
})
