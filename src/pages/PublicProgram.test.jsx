import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { render } from '@testing-library/react'
import { LangProvider } from '../context/LangContext'
import { A11yProvider } from '../context/A11yContext'
import PublicProgram from './PublicProgram'
import { sampleEvent } from '../test/render'
import { programDayIso } from '../data/days'
import { cacheEventsForDay } from '../lib/dataCache'

const eqMock = vi.fn()
const inMock = vi.fn()
const selectMock = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: (...args) => selectMock(...args),
    })),
  },
}))

vi.mock('../lib/analytics', () => ({
  track: vi.fn(),
  trackPageView: vi.fn(),
}))

vi.mock('../components/Footer', () => ({
  default: () => <div data-testid="footer" />,
}))

vi.mock('../components/Header', () => ({
  default: () => <header>header</header>,
}))

function chainResult(data) {
  const result = Promise.resolve({ data, error: null })
  return {
    eq: (...a) => {
      eqMock(...a)
      return result
    },
    in: (...a) => {
      inMock(...a)
      return result
    },
    then: result.then.bind(result),
  }
}

function chainError(error = { message: 'network' }) {
  const result = Promise.resolve({ data: null, error })
  return {
    eq: (...a) => {
      eqMock(...a)
      return result
    },
    in: (...a) => {
      inMock(...a)
      return result
    },
    then: result.then.bind(result),
  }
}

function sampleDayEvents() {
  return [
    sampleEvent({
      id: 'e1',
      dia: programDayIso(),
      titulo: 'Concerto Teste',
      categoria: 'Música',
    }),
    sampleEvent({
      id: 'e2',
      dia: programDayIso(),
      titulo: 'Desfile',
      categoria: 'Cortejo',
      hora: '18:00',
    }),
  ]
}

function renderProgram(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <LangProvider>
        <A11yProvider>
          <PublicProgram />
        </A11yProvider>
      </LangProvider>
    </MemoryRouter>,
  )
}

describe('PublicProgram', () => {
  beforeEach(() => {
    localStorage.clear()
    eqMock.mockReset()
    inMock.mockReset()
    selectMock.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    selectMock.mockImplementation(() => chainResult(sampleDayEvents()))
  })

  it('loads and lists events from supabase', async () => {
    renderProgram('/')
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /concerto teste/i }),
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: /desfile/i })).toBeInTheDocument()
  })

  it('filters by search query', async () => {
    const user = userEvent.setup()
    renderProgram('/')
    await waitFor(() =>
      screen.getByRole('heading', { name: /concerto teste/i }),
    )
    const search = screen.getByRole('searchbox')
    await user.type(search, 'desfile')
    expect(screen.getByRole('heading', { name: /desfile/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /concerto teste/i }),
    ).not.toBeInTheDocument()
  })

  it('shows empty favorites state', async () => {
    const user = userEvent.setup()
    renderProgram('/')
    await waitFor(() => screen.getByText(/concerto teste/i))
    await user.click(screen.getByRole('button', { name: /filtrar/i }))
    await user.click(screen.getByRole('button', { name: /^favoritos$/i }))
    await waitFor(() => {
      expect(screen.getByText(/ainda não marcaste favoritos/i)).toBeInTheDocument()
    })
  })

  it('shows LoadErrorPanel when fetch fails without cache', async () => {
    selectMock.mockImplementation(() => chainError())
    renderProgram('/')
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /não foi possível carregar/i,
      )
    })
    expect(
      screen.getByRole('button', { name: /tentar de novo/i }),
    ).toBeInTheDocument()
  })

  it('falls back to cached day events and shows cached hint', async () => {
    cacheEventsForDay(programDayIso(), [
      sampleEvent({
        id: 'cached-1',
        dia: programDayIso(),
        titulo: 'Evento Em Cache',
        categoria: 'Música',
      }),
    ])
    selectMock.mockImplementation(() => chainError())
    renderProgram('/')
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /evento em cache/i }),
      ).toBeInTheDocument()
    })
    expect(screen.getByText(/dados guardados neste aparelho/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('retries fetch from LoadErrorPanel', async () => {
    const user = userEvent.setup()
    selectMock
      .mockImplementationOnce(() => chainError())
      .mockImplementation(() => chainResult(sampleDayEvents()))

    renderProgram('/')
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /tentar de novo/i }))
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /concerto teste/i }),
      ).toBeInTheDocument()
    })
  })
})
