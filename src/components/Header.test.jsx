import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../test/render'
import Header from './Header'

const track = vi.fn()

vi.mock('../lib/analytics', () => ({
  track: (...args) => track(...args),
  trackPageView: vi.fn(),
}))

describe('Header', () => {
  it('renders brand title', () => {
    renderApp(<Header />)
    expect(
      screen.getByRole('heading', { name: /festas do barrete verde/i }),
    ).toBeInTheDocument()
  })

  it('toggles a11y class on document', async () => {
    const user = userEvent.setup()
    renderApp(<Header />)
    const a11yBtn = screen.getByRole('button', { pressed: false })
    await user.click(a11yBtn)
    expect(document.documentElement.classList.contains('a11y')).toBe(true)
    expect(track).toHaveBeenCalledWith('a11y_toggle', { on: true })
  })

  it('opens language menu and switches language', async () => {
    const user = userEvent.setup()
    renderApp(<Header />)
    await user.click(screen.getByRole('button', { name: /idioma/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^EN$/i }))
    expect(localStorage.getItem('fbv-lang')).toBe('en')
  })
})
