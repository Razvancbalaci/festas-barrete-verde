import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { LangProvider } from '../context/LangContext'
import InstallPrompt, {
  INSTALL_REQUEST_EVENT,
  requestInstallPrompt,
  installBlocksNotify,
  INSTALL_DISMISS_KEY,
} from './InstallPrompt'

function renderInstall(path = '/') {
  return render(
    <LangProvider>
      <MemoryRouter initialEntries={[path]}>
        <InstallPrompt />
      </MemoryRouter>
    </LangProvider>,
  )
}

describe('InstallPrompt', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )
  })

  it('requestInstallPrompt dispatches the install request event', () => {
    const spy = vi.fn()
    window.addEventListener(INSTALL_REQUEST_EVENT, spy)
    requestInstallPrompt()
    expect(spy).toHaveBeenCalled()
    window.removeEventListener(INSTALL_REQUEST_EVENT, spy)
  })

  it('forces the prompt open on desktop via request event', async () => {
    renderInstall('/')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await act(async () => {
      requestInstallPrompt()
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      /adicionar à página inicial/i,
    )
  })

  it('does not render on /admin even when forced', async () => {
    renderInstall('/admin')
    await act(async () => {
      requestInstallPrompt()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('dismiss marks session and hides dialog', async () => {
    const user = userEvent.setup()
    renderInstall('/')
    await act(async () => {
      requestInstallPrompt()
    })
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /fechar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(sessionStorage.getItem(INSTALL_DISMISS_KEY)).toBe('1')
  })

  it('installBlocksNotify is false on desktop', () => {
    expect(installBlocksNotify()).toBe(false)
  })
})
