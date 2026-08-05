import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LangProvider } from '../context/LangContext'
import InAppBrowserBanner from './InAppBrowserBanner'

vi.mock('../lib/push', async () => {
  const actual = await vi.importActual('../lib/push')
  return {
    ...actual,
    isInAppBrowser: vi.fn(() => false),
  }
})

import { isInAppBrowser } from '../lib/push'

describe('InAppBrowserBanner', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.mocked(isInAppBrowser).mockReturnValue(false)
  })

  it('hides outside in-app browsers', () => {
    const { container } = render(
      <LangProvider>
        <InAppBrowserBanner />
      </LangProvider>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows and dismisses in Instagram webview', async () => {
    const user = userEvent.setup()
    vi.mocked(isInAppBrowser).mockReturnValue(true)
    render(
      <LangProvider>
        <InAppBrowserBanner />
      </LangProvider>,
    )
    expect(screen.getByRole('status')).toHaveTextContent(/instagram|chrome|safari/i)
    await user.click(screen.getByRole('button', { name: /fechar/i }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('fbv-inapp-dismissed')).toBe('1')
  })

  it('stays hidden after dismiss in the same session', () => {
    sessionStorage.setItem('fbv-inapp-dismissed', '1')
    vi.mocked(isInAppBrowser).mockReturnValue(true)
    const { container } = render(
      <LangProvider>
        <InAppBrowserBanner />
      </LangProvider>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
