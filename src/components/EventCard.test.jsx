import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, sampleEvent } from '../test/render'
import EventCard from './EventCard'

const track = vi.fn()

vi.mock('../lib/analytics', () => ({
  track: (...args) => track(...args),
  trackPageView: vi.fn(),
}))

vi.mock('../lib/reminders', () => ({
  cancelServerReminder: vi.fn(),
  ensurePushForReminders: vi.fn(),
  getCurrentPushEndpoint: vi.fn(),
  scheduleServerReminder: vi.fn(),
}))

describe('EventCard', () => {
  beforeEach(() => {
    track.mockClear()
    localStorage.clear()
  })

  it('renders title, time and category', () => {
    renderApp(
      <EventCard event={sampleEvent()} index={0} />,
    )
    expect(screen.getByRole('heading', { name: /concerto de abertura/i })).toBeInTheDocument()
    expect(screen.getByText('21:00')).toBeInTheDocument()
  })

  it('toggles favorite into localStorage', async () => {
    const user = userEvent.setup()
    renderApp(<EventCard event={sampleEvent()} index={0} />)
    const fav = screen.getByRole('button', { name: /favorito|favorite|favori|favorito/i })
    await user.click(fav)
    expect(JSON.parse(localStorage.getItem('fbv-favorites'))).toContain('evt-1')
  })

  it('expands description details', async () => {
    const user = userEvent.setup()
    renderApp(
      <EventCard
        event={sampleEvent({ descricao: 'Detalhe longo do evento.' })}
        index={0}
      />,
    )
    await user.click(screen.getByRole('button', { name: /detalhes|details|détails|detalles/i }))
    expect(screen.getByText(/detalhe longo/i)).toBeInTheDocument()
  })

  it('shares via clipboard fallback', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    })

    renderApp(<EventCard event={sampleEvent()} index={0} />)
    await user.click(screen.getByRole('button', { name: /partilhar|share|partager|compartir/i }))
    await waitFor(() => {
      expect(writeText).toHaveBeenCalled()
    })
    expect(track).toHaveBeenCalledWith('share', { event_id: 'evt-1' })
  })

  it('shows ticket link when URL is valid', () => {
    renderApp(
      <EventCard
        event={sampleEvent({ bilhetes_url: 'https://tickets.example/x' })}
        index={0}
      />,
    )
    expect(screen.getByRole('link', { name: /bilhete|ticket|billet|entrada/i })).toHaveAttribute(
      'href',
      'https://tickets.example/x',
    )
  })
})
