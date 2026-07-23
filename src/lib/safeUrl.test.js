import { describe, expect, it } from 'vitest'
import { sanitizeAppPath, absoluteAppUrl } from './safeUrl.js'

describe('sanitizeAppPath', () => {
  it('keeps relative app paths', () => {
    expect(sanitizeAppPath('/?dia=2026-08-07&evento=abc')).toBe(
      '/?dia=2026-08-07&evento=abc'
    )
  })

  it('blocks open redirects', () => {
    expect(sanitizeAppPath('https://evil.example/')).toBe('/')
    expect(sanitizeAppPath('//evil.example')).toBe('/')
    expect(sanitizeAppPath('javascript:alert(1)')).toBe('/')
  })
})

describe('absoluteAppUrl', () => {
  it('resolves against origin', () => {
    expect(absoluteAppUrl('/mapa', 'https://www.festasbarreteverde.pt')).toBe(
      'https://www.festasbarreteverde.pt/mapa'
    )
  })
})
