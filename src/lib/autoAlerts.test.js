import { describe, expect, it } from 'vitest'
import { buildAutoAlertJobs, isPalcoSJoaoShow } from './autoAlerts.js'

describe('isPalcoSJoaoShow', () => {
  it('matches stage local only', () => {
    expect(isPalcoSJoaoShow({ local: 'Palco S. João' })).toBe(true)
    expect(
      isPalcoSJoaoShow({
        local:
          'Av. D. Manuel I, Largo de S. João, Av. 5 de Outubro e Nacional 119',
      })
    ).toBe(false)
  })
})

describe('buildAutoAlertJobs', () => {
  const now = new Date('2026-08-01T12:00:00')

  it('schedules street, corrida and sjoao offsets', () => {
    const jobs = buildAutoAlertJobs(
      [
        {
          id: 'e1',
          dia: '2026-08-07',
          hora: '18:30',
          titulo: '1ª Largada de Touros',
          categoria: 'Toiros',
        },
        {
          id: 'e2',
          dia: '2026-08-07',
          hora: '22:00',
          titulo: 'Corrida de Touros - Mano a Mano',
          local: 'Praça de Touros de Alcochete',
          categoria: 'Toiros',
          bilhetes_url: 'https://example.com',
        },
        {
          id: 'e3',
          dia: '2026-08-07',
          hora: '23:30',
          titulo: 'Black Box',
          local: 'Palco S. João',
          categoria: 'Música',
        },
      ],
      now
    )

    expect(jobs.some((j) => j.dedupe_key === 'auto:street:e1:15')).toBe(true)
    expect(jobs.some((j) => j.dedupe_key === 'auto:corrida:e2:60')).toBe(true)
    expect(jobs.some((j) => j.dedupe_key === 'auto:sjoao:e3:15')).toBe(true)
  })

  it('skips past alerts', () => {
    const jobs = buildAutoAlertJobs(
      [
        {
          id: 'old',
          dia: '2026-08-07',
          hora: '18:00',
          titulo: 'Entrada',
          categoria: 'Toiros',
        },
      ],
      new Date('2026-08-07T18:00:00')
    )
    expect(jobs).toHaveLength(0)
  })
})
