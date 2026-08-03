import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../test/render'
import CategoryFilter from './CategoryFilter'

vi.mock('../lib/analytics', () => ({
  track: vi.fn(),
  trackPageView: vi.fn(),
}))

describe('CategoryFilter', () => {
  it('calls onSelect(null) for "Tudo"', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    renderApp(
      <CategoryFilter selected="Música" onSelect={onSelect} available={['Música']} />,
    )
    await user.click(screen.getByRole('button', { name: /^todas$/i }))
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('toggles category off when clicking the active one', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    renderApp(
      <CategoryFilter selected="Música" onSelect={onSelect} available={['Música']} />,
    )
    await user.click(screen.getByRole('button', { name: /música/i }))
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('only shows available categories', () => {
    renderApp(
      <CategoryFilter selected={null} onSelect={vi.fn()} available={['Música']} />,
    )
    expect(screen.getByRole('button', { name: /música/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /corridas/i })).not.toBeInTheDocument()
  })
})
