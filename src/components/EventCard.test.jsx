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

vi.mock('./InstallPrompt', async () => {
  const actual = await vi.importActual('./InstallPrompt')
  return {
    ...actual,
    requestInstallPrompt: vi.fn(),
  }
})

import {
  ensurePushForReminders,
  scheduleServerReminder,
} from '../lib/reminders'
import { requestInstallPrompt } from './InstallPrompt'

describe('EventCard', () => {
  beforeEach(() => {
    track.mockClear()
    localStorage.clear()
    vi.mocked(ensurePushForReminders).mockReset()
    vi.mocked(scheduleServerReminder).mockReset()
    vi.mocked(requestInstallPrompt).mockReset()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
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

  it('opens install prompt when reminder requires install', async () => {
    const user = userEvent.setup()
    vi.mocked(ensurePushForReminders).mockResolvedValue({
      ok: false,
      reason: 'needInstall',
    })

    const start = new Date(Date.now() + 3 * 60 * 60 * 1000)
    const dia = start.toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' })
    const hora = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`

    renderApp(
      <EventCard event={sampleEvent({ dia, hora })} index={0} />,
    )
    await user.click(
      screen.getByRole('button', { name: /lembrar|remind|rappel|recordar/i }),
    )
    await waitFor(() => {
      expect(requestInstallPrompt).toHaveBeenCalled()
    })
    expect(scheduleServerReminder).not.toHaveBeenCalled()
  })
})
