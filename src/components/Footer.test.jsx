import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../test/render'
import Footer from './Footer'

vi.mock('../lib/analytics', () => ({
  track: vi.fn(),
  trackPageView: vi.fn(),
}))

vi.mock('./NotifyPrefsForm', () => ({
  default: ({ open }) => (open ? <div role="dialog">prefs</div> : null),
}))

vi.mock('./FeedbackForm', () => ({
  default: ({ open }) => (open ? <div role="dialog">feedback</div> : null),
}))

describe('Footer', () => {
  it('opens feedback and notify prefs entry points', async () => {
    const user = userEvent.setup()
    renderApp(<Footer />)
    await user.click(screen.getByRole('button', { name: /feedback/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent(/feedback/i)
    await user.click(screen.getByRole('button', { name: /notifica/i }))
    expect(screen.getByText(/prefs/i)).toBeInTheDocument()
  })

  it('links to privacy', () => {
    renderApp(<Footer />)
    expect(screen.getByRole('link', { name: /privacidade|privacy/i })).toHaveAttribute(
      'href',
      '/privacidade',
    )
  })

  it('links RB initials to Instagram', () => {
    renderApp(<Footer />)
    expect(screen.getByRole('link', { name: /s_razvancb/i })).toHaveAttribute(
      'href',
      'https://instagram.com/s_razvancb',
    )
  })
})
