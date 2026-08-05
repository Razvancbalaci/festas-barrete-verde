import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { LiveNowBanners } from './map/LiveBullLayer'

const labels = {
  bullLiveNow: 'A decorrer no mapa',
  liveNowHide: 'Ocultar',
  liveNowShow: 'Mostrar a decorrer',
  liveNowCount: '{n} a decorrer',
  liveNowMore: '+{n} mais',
}

const items = [
  { id: '1', title: '[TEST] Um', dia: '2026-08-07', kind: 'bull', local: 'A' },
  { id: '2', title: '[TEST] Dois', dia: '2026-08-07', kind: 'stage', local: 'B' },
  { id: '3', title: '[TEST] Três', dia: '2026-08-07', kind: 'bull', local: 'C' },
  { id: '4', title: '[TEST] Quatro', dia: '2026-08-07', kind: 'bull', local: 'D' },
  { id: '5', title: '[TEST] Cinco', dia: '2026-08-07', kind: 'bull', local: 'E' },
]

function renderBanner(props = {}) {
  return render(
    <MemoryRouter>
      <div className="relative h-96">
        <LiveNowBanners labels={labels} items={items} {...props} />
      </div>
    </MemoryRouter>,
  )
}

describe('LiveNowBanners', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null with no items', () => {
    const { container } = render(
      <MemoryRouter>
        <LiveNowBanners labels={labels} items={[]} />
      </MemoryRouter>,
    )
    expect(container.querySelector('[data-testid="live-now-mobile"]')).toBeNull()
  })

  it('shows collapsed count pill on mobile and expands to preview', async () => {
    const user = userEvent.setup()
    localStorage.setItem('fbv-map-live-now', '1')
    renderBanner()

    const mobile = screen.getByTestId('live-now-mobile')
    const pill = within(mobile).getByRole('button', {
      name: /a decorrer no mapa/i,
    })
    expect(pill).toHaveTextContent(/5 a decorrer/i)

    await user.click(pill)
    const panel = within(mobile).getByRole('status')
    expect(within(panel).getByText('[TEST] Um')).toBeInTheDocument()
    expect(within(panel).getByText('[TEST] Dois')).toBeInTheDocument()
    expect(within(panel).queryByText('[TEST] Três')).not.toBeInTheDocument()
    expect(
      within(panel).getByRole('button', { name: /\+3 mais/i }),
    ).toBeInTheDocument()
  })

  it('expands full list via +N mais and can hide', async () => {
    const user = userEvent.setup()
    localStorage.setItem('fbv-map-live-now', '1')
    renderBanner()

    const mobile = screen.getByTestId('live-now-mobile')
    await user.click(
      within(mobile).getByRole('button', { name: /a decorrer no mapa/i }),
    )
    await user.click(
      within(mobile).getByRole('button', { name: /\+3 mais/i }),
    )

    const panel = within(mobile).getByRole('status')
    expect(within(panel).getByText('[TEST] Cinco')).toBeInTheDocument()

    await user.click(within(panel).getByRole('button', { name: /ocultar/i }))
    expect(
      within(screen.getByTestId('live-now-mobile')).getByRole('button', {
        name: /5 a decorrer|mostrar a decorrer/i,
      }),
    ).toBeInTheDocument()
  })

  it('shows full list on desktop panel', () => {
    localStorage.setItem('fbv-map-live-now', '1')
    renderBanner()
    const desktop = screen.getByTestId('live-now-desktop')
    expect(within(desktop).getByText('[TEST] Cinco')).toBeInTheDocument()
  })
})
