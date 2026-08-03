import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  FORM_COOLDOWN_MS,
  formatCooldownSeconds,
  getCooldownRemainingMs,
  isHoneypotFilled,
  markFormSubmitted,
} from './formSpamGuard.js'

describe('formSpamGuard', () => {
  const store = new Map()

  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    })
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('detects filled honeypot', () => {
    expect(isHoneypotFilled('')).toBe(false)
    expect(isHoneypotFilled('   ')).toBe(false)
    expect(isHoneypotFilled('http://spam.test')).toBe(true)
  })

  it('tracks cooldown via localStorage', () => {
    expect(getCooldownRemainingMs('k')).toBe(0)
    markFormSubmitted('k')
    expect(getCooldownRemainingMs('k')).toBe(FORM_COOLDOWN_MS)
    vi.advanceTimersByTime(10_000)
    expect(getCooldownRemainingMs('k')).toBe(20_000)
    vi.advanceTimersByTime(25_000)
    expect(getCooldownRemainingMs('k')).toBe(0)
  })

  it('formats cooldown seconds', () => {
    expect(formatCooldownSeconds(1)).toBe(1)
    expect(formatCooldownSeconds(30_000)).toBe(30)
    expect(formatCooldownSeconds(1001)).toBe(2)
  })
})
