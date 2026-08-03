import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp, sampleEvent } from '../test/render'
import EventList from './EventList'

vi.mock('../lib/analytics', () => ({
  track: vi.fn(),
  trackPageView: vi.fn(),
}))

vi.mock('./EventCard', () => ({
  default: ({ event, highlighted }) => (
    <div data-testid={`card-${event.id}`} data-highlighted={highlighted ? '1' : '0'}>
      {event.titulo}
    </div>
  ),
}))

describe('EventList', () => {
  it('shows loading skeleton', () => {
    renderApp(<EventList events={[]} loading />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
  })

  it('shows empty filter message', () => {
    renderApp(<EventList events={[]} loading={false} hasFilter />)
    expect(screen.getByText(/nenhum evento/i)).toBeInTheDocument()
  })

  it('shows favorites empty message', () => {
    renderApp(<EventList events={[]} loading={false} favoritesEmpty />)
    expect(screen.getByText(/favorito/i)).toBeInTheDocument()
  })

  it('renders event cards and highlight', () => {
    const events = [
      sampleEvent({ id: 'a', titulo: 'Evento A' }),
      sampleEvent({ id: 'b', titulo: 'Evento B' }),
    ]
    renderApp(
      <EventList events={events} loading={false} highlightId="b" />,
    )
    expect(screen.getByTestId('card-a')).toHaveAttribute('data-highlighted', '0')
    expect(screen.getByTestId('card-b')).toHaveAttribute('data-highlighted', '1')
  })

  it('groups by day when requested', () => {
    const events = [
      sampleEvent({ id: 'a', dia: '2026-08-07', titulo: 'Sex' }),
      sampleEvent({ id: 'b', dia: '2026-08-08', titulo: 'Sab' }),
    ]
    renderApp(
      <EventList events={events} loading={false} groupByDay />,
    )
    expect(screen.getByRole('heading', { name: /sexta|friday|vendredi|viernes/i })).toBeInTheDocument()
  })
})
