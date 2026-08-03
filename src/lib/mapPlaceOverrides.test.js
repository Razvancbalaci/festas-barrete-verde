import { describe, expect, it } from 'vitest'
import { applyMapPlaceOverrides } from './mapPlaceOverrides.js'

describe('applyMapPlaceOverrides', () => {
  const base = [
    { id: 'sede', name: 'Sede', lat: 1, lng: 2, kind: 'local' },
    { id: 'igreja', name: 'Igreja', lat: 3, lng: 4, kind: 'local' },
  ]

  it('returns copies when no overrides', () => {
    const out = applyMapPlaceOverrides(base, [])
    expect(out).toHaveLength(2)
    expect(out[0].lat).toBe(1)
    expect(out[0]._overridden).toBe(false)
  })

  it('merges lat/lng/name/hidden', () => {
    const out = applyMapPlaceOverrides(base, [
      { place_id: 'sede', lat: 9.5, lng: -8.9, name: 'Sede nova', hidden: true },
    ])
    expect(out[0]).toMatchObject({
      id: 'sede',
      lat: 9.5,
      lng: -8.9,
      name: 'Sede nova',
      hidden: true,
      _overridden: true,
    })
    expect(out[1].lat).toBe(3)
  })

  it('appends custom places', () => {
    const out = applyMapPlaceOverrides(base, [
      {
        place_id: 'custom-posto-abc',
        lat: 38.7,
        lng: -8.9,
        name: 'Posto de informação',
        kind: 'local',
        emoji: 'ℹ️',
        is_custom: true,
        hidden: false,
      },
    ])
    expect(out).toHaveLength(3)
    expect(out[2]).toMatchObject({
      id: 'custom-posto-abc',
      name: 'Posto de informação',
      kind: 'local',
      emoji: 'ℹ️',
      _custom: true,
      _overridden: true,
    })
  })
})
