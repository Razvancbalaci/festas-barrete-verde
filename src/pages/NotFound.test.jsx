import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp } from '../test/render'
import NotFound from './NotFound'
import Privacy from './Privacy'

vi.mock('../lib/analytics', () => ({
  track: vi.fn(),
  trackPageView: vi.fn(),
}))

vi.mock('../components/Footer', () => ({
  default: () => <div data-testid="footer" />,
}))

describe('NotFound', () => {
  it('shows 404 and a link back home', () => {
    renderApp(<NotFound />)
    expect(screen.getByRole('heading', { name: /página não encontrada/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /voltar ao programa/i })).toHaveAttribute(
      'href',
      '/',
    )
  })
})

describe('Privacy', () => {
  it('renders privacy title and sections', () => {
    renderApp(<Privacy />)
    expect(
      screen.getByRole('heading', { level: 1, name: /privacidade/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /voltar/i })).toHaveAttribute('href', '/')
  })
})
