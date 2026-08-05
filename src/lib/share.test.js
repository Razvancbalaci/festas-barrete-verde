import { describe, expect, it } from 'vitest'
import { eventShareText, eventShareUrl, SITE_ORIGIN } from './share.js'

describe('eventShareUrl', () => {
  it('builds canonical deep link with dia and evento', () => {
    expect(
      eventShareUrl({ id: 'abc-1', dia: '2026-08-07' }),
    ).toBe(`${SITE_ORIGIN}/?dia=2026-08-07&evento=abc-1`)
  })

  it('encodes special characters', () => {
    expect(eventShareUrl({ id: 'a b', dia: '2026-08-07' }, { origin: 'https://x.test' })).toBe(
      'https://x.test/?dia=2026-08-07&evento=a%20b',
    )
  })
})

describe('eventShareText', () => {
  it('formats hour, title and place', () => {
    expect(
      eventShareText({
        hora: '18:00',
        titulo: 'Entrada',
        local: 'Praça',
      }),
    ).toBe('18:00 · Entrada — Praça')
  })
})
