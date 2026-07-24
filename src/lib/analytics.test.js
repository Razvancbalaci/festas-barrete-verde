import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ error: null }),
  },
}))

describe('analytics', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('localStorage', {
      store: {},
      getItem(k) {
        return this.store[k] ?? null
      },
      setItem(k, v) {
        this.store[k] = String(v)
      },
      clear() {
        this.store = {}
      },
    })
    vi.stubGlobal('window', {
      location: { pathname: '/' },
      setTimeout: (fn) => fn(),
      clearTimeout: () => {},
    })
    vi.stubGlobal('document', {
      addEventListener: () => {},
    })
  })

  it('creates and reuses session id', async () => {
    const { getAnalyticsSessionId } = await import('./analytics.js')
    const a = getAnalyticsSessionId()
    const b = getAnalyticsSessionId()
    expect(a).toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(8)
  })

  it('queues track calls without throwing', async () => {
    const { track } = await import('./analytics.js')
    expect(() => track('page_view', { route: '/' })).not.toThrow()
  })
})
