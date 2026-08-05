import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NowHappeningBanner from './NowHappeningBanner'

const labels = {
  happeningNow: 'A decorrer agora',
  happeningNext: 'A seguir',
}

describe('NowHappeningBanner', () => {
  it('returns null when there is nothing upcoming', () => {
    const { container } = render(
      <NowHappeningBanner
        events={[]}
        labels={labels}
        now={new Date('2026-08-07T12:00:00')}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows live label for an event happening now', () => {
    render(
      <NowHappeningBanner
        events={[
          {
            id: '1',
            dia: '2026-08-07',
            hora: '11:30',
            titulo: 'Concerto',
            categoria: 'Música',
            local: 'Palco Salineiro',
          },
        ]}
        labels={labels}
        now={new Date('2026-08-07T12:00:00')}
      />,
    )
    expect(screen.getByText(/a decorrer agora/i)).toBeInTheDocument()
    expect(screen.getByText(/concerto/i)).toBeInTheDocument()
  })

  it('shows next label for a future event today', () => {
    render(
      <NowHappeningBanner
        events={[
          {
            id: '2',
            dia: '2026-08-07',
            hora: '18:00',
            titulo: 'Desfile',
            categoria: 'Institucional',
          },
        ]}
        labels={labels}
        now={new Date('2026-08-07T12:00:00')}
      />,
    )
    expect(screen.getByText(/^a seguir$/i)).toBeInTheDocument()
  })

  it('calls onOpen with the featured event', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    const event = {
      id: '1',
      dia: '2026-08-07',
      hora: '11:30',
      titulo: 'Concerto',
      categoria: 'Música',
    }
    render(
      <NowHappeningBanner
        events={[event]}
        labels={labels}
        onOpen={onOpen}
        now={new Date('2026-08-07T12:00:00')}
      />,
    )
    await user.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }))
  })
})
