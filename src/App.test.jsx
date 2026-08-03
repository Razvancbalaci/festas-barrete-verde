import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('./pages/PublicProgram', () => ({
  default: () => <div>programa-publico</div>,
}))
vi.mock('./pages/FestivalMap', () => ({
  default: () => <div>mapa-page</div>,
}))
vi.mock('./pages/Negocios', () => ({
  default: () => <div>comercio-page</div>,
}))
vi.mock('./pages/Admin', () => ({
  default: () => <div>admin-page</div>,
}))
vi.mock('./pages/Privacy', () => ({
  default: () => <div>privacy-page</div>,
}))
vi.mock('./pages/NotFound', () => ({
  default: () => <div>not-found-page</div>,
}))
vi.mock('./components/InstallPrompt', () => ({ default: () => null }))
vi.mock('./components/NotifyPrompt', () => ({ default: () => null }))
vi.mock('./components/OfflineBanner', () => ({ default: () => null }))
vi.mock('./components/AnalyticsTracker', () => ({ default: () => null }))
vi.mock('./hooks/useLocalExtras', async () => {
  const actual = await vi.importActual('./hooks/useLocalExtras')
  return {
    ...actual,
    useReminderTicker: () => {},
  }
})
vi.mock('./lib/analytics', () => ({
  track: vi.fn(),
  trackPageView: vi.fn(),
}))

describe('App routing', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders public program on /', async () => {
    window.history.replaceState({}, '', '/')
    const { default: App } = await import('./App')
    render(<App />)
    expect(await screen.findByText('programa-publico')).toBeInTheDocument()
  })

  it('redirects /negocios to /comercio', async () => {
    window.history.replaceState({}, '', '/negocios')
    const { default: App } = await import('./App')
    render(<App />)
    expect(await screen.findByText('comercio-page')).toBeInTheDocument()
  })

  it('redirects /privacy to privacy page', async () => {
    window.history.replaceState({}, '', '/privacy')
    const { default: App } = await import('./App')
    render(<App />)
    expect(await screen.findByText('privacy-page')).toBeInTheDocument()
  })

  it('shows 404 for unknown routes', async () => {
    window.history.replaceState({}, '', '/rota-inexistente')
    const { default: App } = await import('./App')
    render(<App />)
    expect(await screen.findByText('not-found-page')).toBeInTheDocument()
  })

  it('lazy-loads admin', async () => {
    window.history.replaceState({}, '', '/admin')
    const { default: App } = await import('./App')
    render(<App />)
    expect(await screen.findByText('admin-page')).toBeInTheDocument()
  })
})
