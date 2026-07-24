import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { raceTimeout, urlBase64ToUint8Array } from './push'

describe('urlBase64ToUint8Array', () => {
  it('decodes url-safe base64', () => {
    const bytes = urlBase64ToUint8Array('AQID')
    expect(Array.from(bytes)).toEqual([1, 2, 3])
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
