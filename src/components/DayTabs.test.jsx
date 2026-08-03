import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../test/render'
import DayTabs from './DayTabs'
import { FESTIVAL_DAYS } from '../data/days'

vi.mock('../lib/analytics', () => ({
  track: vi.fn(),
  trackPageView: vi.fn(),
}))

describe('DayTabs', () => {
  it('calls onSelect when a day is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    renderApp(
      <DayTabs selectedDate={FESTIVAL_DAYS[0].date} onSelect={onSelect} />,
    )
    await user.click(screen.getByRole('button', { name: /8/i }))
    expect(onSelect).toHaveBeenCalledWith('2026-08-08')
  })

  it('links to map and commerce', () => {
    renderApp(
      <DayTabs selectedDate={FESTIVAL_DAYS[0].date} onSelect={vi.fn()} />,
    )
    expect(screen.getByRole('link', { name: /mapa/i })).toHaveAttribute(
      'href',
      '/mapa',
    )
    expect(screen.getByRole('link', { name: /comércio|comercio/i })).toHaveAttribute(
      'href',
      '/comercio',
    )
  })
})
