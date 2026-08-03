import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderApp } from '../test/render'
import OfflineBanner from './OfflineBanner'
import { LangProvider } from '../context/LangContext'

vi.mock('../lib/analytics', () => ({
  track: vi.fn(),
  trackPageView: vi.fn(),
}))

describe('OfflineBanner', () => {
  it('is hidden when online', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    render(
      <LangProvider>
        <OfflineBanner />
      </LangProvider>,
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows status when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    render(
      <LangProvider>
        <OfflineBanner />
      </LangProvider>,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('HoneypotField', () => {
  it('renders an off-screen url_extra input', async () => {
    const { default: HoneypotField } = await import('./HoneypotField')
    renderApp(
      <HoneypotField id="hp" value="" onChange={() => {}} />,
    )
    const input = document.querySelector('#hp')
    expect(input).toBeTruthy()
    expect(input).toHaveAttribute('name', 'url_extra')
    expect(input).toHaveAttribute('tabindex', '-1')
  })
})
