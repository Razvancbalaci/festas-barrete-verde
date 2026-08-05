import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import AdminSessionGuard from './AdminSessionGuard'

const signOut = vi.fn()
const getSession = vi.fn()
let authListener = null

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args) => getSession(...args),
      signOut: (...args) => signOut(...args),
      onAuthStateChange: (cb) => {
        authListener = cb
        return {
          data: {
            subscription: { unsubscribe: vi.fn() },
          },
        }
      },
    },
  },
}))

const startAdminIdleWatch = vi.fn()
const clearAdminActivity = vi.fn()

vi.mock('../lib/adminSessionIdle', async () => {
  const actual = await vi.importActual('../lib/adminSessionIdle')
  return {
    ...actual,
    startAdminIdleWatch: (...args) => startAdminIdleWatch(...args),
    clearAdminActivity: (...args) => clearAdminActivity(...args),
  }
})

describe('AdminSessionGuard', () => {
  beforeEach(() => {
    authListener = null
    signOut.mockReset().mockResolvedValue({})
    getSession.mockReset().mockResolvedValue({ data: { session: null } })
    startAdminIdleWatch.mockReset().mockReturnValue(vi.fn())
    clearAdminActivity.mockReset()
    sessionStorage.clear()
  })

  it('does not start idle watch without session', async () => {
    render(<AdminSessionGuard />)
    await waitFor(() => expect(getSession).toHaveBeenCalled())
    expect(startAdminIdleWatch).not.toHaveBeenCalled()
  })

  it('starts idle watch when session already exists', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'admin' } } },
    })
    render(<AdminSessionGuard />)
    await waitFor(() => expect(startAdminIdleWatch).toHaveBeenCalledTimes(1))
  })

  it('starts watch on SIGNED_IN and stops on SIGNED_OUT', async () => {
    render(<AdminSessionGuard />)
    await waitFor(() => expect(authListener).toBeTruthy())

    act(() => {
      authListener('SIGNED_IN', { user: { id: 'admin' } })
    })
    expect(startAdminIdleWatch).toHaveBeenCalledTimes(1)

    const stop = startAdminIdleWatch.mock.results[0].value
    act(() => {
      authListener('SIGNED_OUT', null)
    })
    expect(stop).toHaveBeenCalled()
    expect(clearAdminActivity).toHaveBeenCalled()
  })

  it('does not restart idle watch on TOKEN_REFRESHED', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'admin' } } },
    })
    render(<AdminSessionGuard />)
    await waitFor(() => expect(startAdminIdleWatch).toHaveBeenCalledTimes(1))

    act(() => {
      authListener('TOKEN_REFRESHED', { user: { id: 'admin' } })
    })
    expect(startAdminIdleWatch).toHaveBeenCalledTimes(1)
  })

  it('signs out when idle watch expires', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'admin' } } },
    })
    let onExpire
    startAdminIdleWatch.mockImplementation(({ onExpire: cb }) => {
      onExpire = cb
      return vi.fn()
    })

    render(<AdminSessionGuard />)
    await waitFor(() => expect(onExpire).toBeTypeOf('function'))

    await act(async () => {
      await onExpire()
    })
    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('ignores concurrent expire calls', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'admin' } } },
    })
    let onExpire
    let resolveSignOut
    signOut.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignOut = resolve
        }),
    )
    startAdminIdleWatch.mockImplementation(({ onExpire: cb }) => {
      onExpire = cb
      return vi.fn()
    })

    render(<AdminSessionGuard />)
    await waitFor(() => expect(onExpire).toBeTypeOf('function'))

    let first
    let second
    await act(async () => {
      first = onExpire()
      second = onExpire()
    })
    expect(signOut).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveSignOut({})
      await Promise.all([first, second])
    })
  })

  it('survives signOut failures', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'admin' } } },
    })
    signOut.mockRejectedValue(new Error('network'))
    let onExpire
    startAdminIdleWatch.mockImplementation(({ onExpire: cb }) => {
      onExpire = cb
      return vi.fn()
    })

    render(<AdminSessionGuard />)
    await waitFor(() => expect(onExpire).toBeTypeOf('function'))

    await act(async () => {
      await expect(onExpire()).resolves.toBeUndefined()
    })
    expect(signOut).toHaveBeenCalled()
  })

  it('cleans up on unmount', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'admin' } } },
    })
    const stop = vi.fn()
    startAdminIdleWatch.mockReturnValue(stop)

    const { unmount } = render(<AdminSessionGuard />)
    await waitFor(() => expect(startAdminIdleWatch).toHaveBeenCalled())
    unmount()
    expect(stop).toHaveBeenCalled()
    expect(clearAdminActivity).toHaveBeenCalled()
  })
})
