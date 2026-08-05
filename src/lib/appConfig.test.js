import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchAppConfig,
  isLiveSmokeGateEnabled,
  resetAppConfigCache,
  setLiveSmokeGateEnabled,
  updateLiveSmokeTestEnabled,
} from './appConfig'

const mockFrom = vi.fn()
const mockGetSession = vi.fn()

vi.mock('./supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}))

vi.mock('./liveSmokeTest', () => ({
  setLiveSmokeTest: vi.fn(),
}))

describe('appConfig', () => {
  beforeEach(() => {
    resetAppConfigCache()
    mockFrom.mockReset()
    mockGetSession.mockReset()
    mockGetSession.mockResolvedValue({ data: { session: null } })
  })

  it('defaults to gate off before fetch', () => {
    expect(isLiveSmokeGateEnabled()).toBe(false)
  })

  it('stays off for anonymous visitors', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    const res = await fetchAppConfig()
    expect(res.liveSmokeTestEnabled).toBe(false)
    expect(res.authenticated).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('loads live smoke flag when admin session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'admin-1' } } },
    })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { live_smoke_test_enabled: true },
            error: null,
          }),
        }),
      }),
    })

    const res = await fetchAppConfig()
    expect(res.liveSmokeTestEnabled).toBe(true)
    expect(res.authenticated).toBe(true)
    expect(isLiveSmokeGateEnabled()).toBe(true)
  })

  it('updates live smoke flag', async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { live_smoke_test_enabled: true },
              error: null,
            }),
          }),
        }),
      }),
    })

    await updateLiveSmokeTestEnabled(true)
    expect(isLiveSmokeGateEnabled()).toBe(true)
  })

  it('does not re-dispatch when gate value is unchanged', () => {
    const spy = vi.fn()
    window.addEventListener('fbv-app-config-changed', spy)
    setLiveSmokeGateEnabled(false)
    setLiveSmokeGateEnabled(false)
    expect(spy).not.toHaveBeenCalled()
    setLiveSmokeGateEnabled(true)
    expect(spy).toHaveBeenCalledTimes(1)
    setLiveSmokeGateEnabled(true)
    expect(spy).toHaveBeenCalledTimes(1)
    window.removeEventListener('fbv-app-config-changed', spy)
  })
})
