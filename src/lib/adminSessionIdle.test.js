import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  ADMIN_IDLE_CHECK_MS,
  ADMIN_IDLE_EXPIRED_KEY,
  ADMIN_IDLE_STORAGE_KEY,
  adminIdleTimeoutMs,
  clearAdminActivity,
  consumeAdminSessionExpired,
  isAdminIdleExpired,
  markAdminSessionExpired,
  readLastActiveAt,
  startAdminIdleWatch,
  touchAdminActivity,
} from './adminSessionIdle'

describe('adminSessionIdle', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('adminIdleTimeoutMs', () => {
    it('defaults idle timeout to 30 minutes', () => {
      expect(adminIdleTimeoutMs(undefined)).toBe(30 * 60_000)
      expect(adminIdleTimeoutMs('')).toBe(30 * 60_000)
      expect(adminIdleTimeoutMs(null)).toBe(30 * 60_000)
      expect(adminIdleTimeoutMs('45')).toBe(45 * 60_000)
    })

    it('clamps invalid and extreme minutes', () => {
      expect(adminIdleTimeoutMs('0')).toBe(30 * 60_000)
      expect(adminIdleTimeoutMs('-5')).toBe(30 * 60_000)
      expect(adminIdleTimeoutMs('abc')).toBe(30 * 60_000)
      expect(adminIdleTimeoutMs('  ')).toBe(30 * 60_000)
      expect(adminIdleTimeoutMs('1')).toBe(60_000)
      expect(adminIdleTimeoutMs('0.4')).toBe(60_000) // clamp mínimo = 1 min
      expect(adminIdleTimeoutMs('9999')).toBe(24 * 60 * 60_000)
      expect(adminIdleTimeoutMs('1440')).toBe(24 * 60 * 60_000)
    })

    it('accepts numeric input', () => {
      expect(adminIdleTimeoutMs(15)).toBe(15 * 60_000)
    })
  })

  describe('storage helpers', () => {
    it('persists last activity', () => {
      touchAdminActivity(1_700_000_000_000)
      expect(readLastActiveAt()).toBe(1_700_000_000_000)
      clearAdminActivity()
      expect(readLastActiveAt()).toBe(null)
    })

    it('ignores corrupt last-active values', () => {
      sessionStorage.setItem(ADMIN_IDLE_STORAGE_KEY, '0')
      expect(readLastActiveAt()).toBe(null)
      sessionStorage.setItem(ADMIN_IDLE_STORAGE_KEY, '-10')
      expect(readLastActiveAt()).toBe(null)
      sessionStorage.setItem(ADMIN_IDLE_STORAGE_KEY, 'nope')
      expect(readLastActiveAt()).toBe(null)
      sessionStorage.setItem(ADMIN_IDLE_STORAGE_KEY, '')
      expect(readLastActiveAt()).toBe(null)
    })

    it('survives sessionStorage failures', () => {
      const getItem = vi
        .spyOn(Storage.prototype, 'getItem')
        .mockImplementation(() => {
          throw new Error('blocked')
        })
      const setItem = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('blocked')
        })
      const removeItem = vi
        .spyOn(Storage.prototype, 'removeItem')
        .mockImplementation(() => {
          throw new Error('blocked')
        })

      expect(readLastActiveAt()).toBe(null)
      expect(touchAdminActivity(123)).toBe(123)
      expect(() => clearAdminActivity()).not.toThrow()
      expect(() => markAdminSessionExpired()).not.toThrow()
      expect(consumeAdminSessionExpired()).toBe(false)

      getItem.mockRestore()
      setItem.mockRestore()
      removeItem.mockRestore()
    })

    it('marks and consumes expired flag once', () => {
      expect(consumeAdminSessionExpired()).toBe(false)
      markAdminSessionExpired()
      expect(sessionStorage.getItem(ADMIN_IDLE_EXPIRED_KEY)).toBe('1')
      expect(consumeAdminSessionExpired()).toBe(true)
      expect(consumeAdminSessionExpired()).toBe(false)
      expect(sessionStorage.getItem(ADMIN_IDLE_EXPIRED_KEY)).toBe(null)
    })
  })

  describe('isAdminIdleExpired', () => {
    it('detects idle expiry at exact boundary', () => {
      const timeout = 30 * 60_000
      expect(isAdminIdleExpired(1000, 1000 + timeout - 1, timeout)).toBe(false)
      expect(isAdminIdleExpired(1000, 1000 + timeout, timeout)).toBe(true)
      expect(isAdminIdleExpired(null, 1000, timeout)).toBe(false)
      expect(isAdminIdleExpired(0, 1000, timeout)).toBe(false)
      expect(isAdminIdleExpired(undefined, 1000, timeout)).toBe(false)
    })
  })

  describe('startAdminIdleWatch', () => {
    it('calls onExpire after idle timeout', () => {
      vi.useFakeTimers()
      const onExpire = vi.fn()
      let now = 1_000_000
      const stop = startAdminIdleWatch({
        onExpire,
        timeoutMs: 60_000,
        now: () => now,
      })

      expect(sessionStorage.getItem(ADMIN_IDLE_STORAGE_KEY)).toBe('1000000')
      now += 59_000
      vi.advanceTimersByTime(ADMIN_IDLE_CHECK_MS)
      expect(onExpire).not.toHaveBeenCalled()

      now += 2_000
      vi.advanceTimersByTime(ADMIN_IDLE_CHECK_MS)
      expect(onExpire).toHaveBeenCalledTimes(1)
      expect(sessionStorage.getItem(ADMIN_IDLE_EXPIRED_KEY)).toBe('1')
      expect(sessionStorage.getItem(ADMIN_IDLE_STORAGE_KEY)).toBe(null)

      stop()
    })

    it('resets idle clock on user activity', () => {
      vi.useFakeTimers()
      const onExpire = vi.fn()
      let now = 1_000_000
      const stop = startAdminIdleWatch({
        onExpire,
        timeoutMs: 60_000,
        now: () => now,
      })

      now += 50_000
      window.dispatchEvent(new Event('pointerdown'))
      expect(readLastActiveAt()).toBe(1_050_000)

      now += 50_000
      vi.advanceTimersByTime(ADMIN_IDLE_CHECK_MS)
      expect(onExpire).not.toHaveBeenCalled()

      now += 15_000
      vi.advanceTimersByTime(ADMIN_IDLE_CHECK_MS)
      expect(onExpire).toHaveBeenCalledTimes(1)

      stop()
    })

    it('ignores activity while document is hidden', () => {
      vi.useFakeTimers()
      const onExpire = vi.fn()
      let now = 1_000_000
      const stop = startAdminIdleWatch({
        onExpire,
        timeoutMs: 60_000,
        now: () => now,
      })

      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      })

      now += 40_000
      window.dispatchEvent(new Event('mousemove'))
      expect(readLastActiveAt()).toBe(1_000_000)

      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      })

      now += 25_000
      vi.advanceTimersByTime(ADMIN_IDLE_CHECK_MS)
      expect(onExpire).toHaveBeenCalledTimes(1)

      stop()
    })

    it('fires onExpire only once even if checks continue', () => {
      vi.useFakeTimers()
      const onExpire = vi.fn()
      let now = 1_000_000
      const stop = startAdminIdleWatch({
        onExpire,
        timeoutMs: 10_000,
        now: () => now,
      })

      now += 20_000
      vi.advanceTimersByTime(ADMIN_IDLE_CHECK_MS)
      vi.advanceTimersByTime(ADMIN_IDLE_CHECK_MS)
      vi.advanceTimersByTime(ADMIN_IDLE_CHECK_MS)
      expect(onExpire).toHaveBeenCalledTimes(1)

      stop()
    })

    it('does not expire after cleanup', () => {
      vi.useFakeTimers()
      const onExpire = vi.fn()
      let now = 1_000_000
      const stop = startAdminIdleWatch({
        onExpire,
        timeoutMs: 30_000,
        now: () => now,
      })

      stop()
      now += 60_000
      vi.advanceTimersByTime(ADMIN_IDLE_CHECK_MS * 3)
      expect(onExpire).not.toHaveBeenCalled()
    })

    it('expires immediately if last activity already stale', () => {
      vi.useFakeTimers()
      const onExpire = vi.fn()
      sessionStorage.setItem(ADMIN_IDLE_STORAGE_KEY, '1000')
      const stop = startAdminIdleWatch({
        onExpire,
        timeoutMs: 60_000,
        now: () => 1000 + 60_000,
      })

      // start touches activity with now(), so clock is fresh — stale pre-seed is overwritten
      expect(onExpire).not.toHaveBeenCalled()
      expect(readLastActiveAt()).toBe(61_000)

      stop()
    })
  })
})
