import { describe, expect, it } from 'vitest'
import { sanitizeAppPath, absoluteAppUrl, sanitizeHttpUrl } from './safeUrl.js'

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

describe('sanitizeHttpUrl', () => {
  it('keeps http(s) urls', () => {
    expect(sanitizeHttpUrl('https://tickets.example/path')).toBe(
      'https://tickets.example/path'
    )
    expect(sanitizeHttpUrl('http://example.com')).toBe('http://example.com/')
  })

  it('prefixes bare hosts with https', () => {
    expect(sanitizeHttpUrl('example.com/page')).toBe('https://example.com/page')
  })

  it('blocks non-http schemes', () => {
    expect(sanitizeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizeHttpUrl('data:text/html,hi')).toBeNull()
    expect(sanitizeHttpUrl('')).toBeNull()
  })
})
