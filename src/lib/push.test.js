import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  isInAppBrowser,
  raceTimeout,
  urlBase64ToUint8Array,
} from './push'

describe('urlBase64ToUint8Array', () => {
  it('decodes url-safe base64', () => {
    const bytes = urlBase64ToUint8Array('AQID')
    expect(Array.from(bytes)).toEqual([1, 2, 3])
  })
})

describe('isInAppBrowser', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ['Instagram', 'Mozilla/5.0 Instagram 1.0'],
    ['Facebook', 'Mozilla/5.0 FBAN/FBIOS'],
    ['TikTok', 'Mozilla/5.0 TikTok 1.0'],
  ])('detects %s webview', (_name, ua) => {
    vi.stubGlobal('navigator', { userAgent: ua })
    expect(isInAppBrowser()).toBe(true)
  })

  it('returns false for normal Chrome', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    })
    expect(isInAppBrowser()).toBe(false)
  })
})

describe('raceTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves with timeout sentinel when slow', async () => {
    const slow = new Promise(() => {})
    const raced = raceTimeout(slow, 1000, 'timed-out')
    vi.advanceTimersByTime(1000)
    await expect(raced).resolves.toBe('timed-out')
  })

  it('resolves with promise value when fast', async () => {
    const fast = Promise.resolve('ok')
    const raced = raceTimeout(fast, 1000, 'timed-out')
    await expect(raced).resolves.toBe('ok')
  })
})
