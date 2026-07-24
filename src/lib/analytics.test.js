import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const rpcMock = vi.fn().mockResolvedValue({ error: null })

vi.mock('./supabase', () => ({
  supabase: { rpc: rpcMock },
}))

function setupBrowser(pathname = '/') {
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
    location: { pathname },
    setTimeout: (fn, _ms) => {
      fn()
      return 1
    },
    clearTimeout: () => {},
    matchMedia: () => ({ matches: false }),
    navigator: { standalone: false },
  })
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    addEventListener: () => {},
  })
  vi.stubGlobal('crypto', {
    randomUUID: () => 'test-session-uuid-1234',
  })
}

describe('analytics', () => {
  beforeEach(() => {
    vi.resetModules()
    rpcMock.mockClear()
    setupBrowser('/')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates and reuses session id', async () => {
    const { getAnalyticsSessionId } = await import('./analytics.js')
    expect(getAnalyticsSessionId()).toBe('test-session-uuid-1234')
    expect(getAnalyticsSessionId()).toBe('test-session-uuid-1234')
  })

  it('does not track on admin routes', async () => {
    setupBrowser('/admin')
    const { track } = await import('./analytics.js')
    track('page_view', { route: '/admin' })
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('flushes queued events via record_analytics_event rpc', async () => {
    const { track } = await import('./analytics.js')
    track('favorite_add', { event_id: 'abc' })
    expect(rpcMock).toHaveBeenCalledWith('record_analytics_event', {
      p_event_name: 'favorite_add',
      p_payload: { event_id: 'abc' },
      p_session_id: 'test-session-uuid-1234',
    })
  })

  it('trackPageView sends route, lang and standalone flag', async () => {
    const { trackPageView } = await import('./analytics.js')
    trackPageView('/mapa', { lang: 'pt' })
    expect(rpcMock).toHaveBeenCalledWith('record_analytics_event', {
      p_event_name: 'page_view',
      p_payload: { route: '/mapa', lang: 'pt', standalone: false },
      p_session_id: 'test-session-uuid-1234',
    })
  })

  it('queues a second event while the first flush is in progress', async () => {
    let resolveRpc
    rpcMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRpc = resolve
        })
    )
    const { track } = await import('./analytics.js')
    track('share', { event_id: '1' })
    track('ticket_click', { event_id: '2' })
    expect(rpcMock).toHaveBeenCalledTimes(1)
    resolveRpc({ error: null })
    await vi.waitFor(() => {
      expect(rpcMock).toHaveBeenCalledTimes(2)
    })
  })
})
