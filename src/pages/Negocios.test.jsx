import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Negocios from './Negocios'
import { LangProvider } from '../context/LangContext'
import { FORM_SUBMIT_KEYS } from '../lib/formSpamGuard'

const insertMock = vi.fn()
const orderMock = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: (...args) => insertMock(...args),
      select: () => ({
        eq: () => ({
          order: (...args) => orderMock(...args),
        }),
      }),
    })),
  },
}))

vi.mock('../lib/analytics', () => ({
  track: vi.fn(),
}))

vi.mock('../components/Footer', () => ({
  default: function FooterStub() {
    return <div data-testid="footer" />
  },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <LangProvider>
        <Negocios />
      </LangProvider>
    </MemoryRouter>,
  )
}

async function openPromoteForm(user) {
  const promote = await screen.findByRole('button', {
    name: /^promover o meu comércio$/i,
  })
  await user.click(promote)
  expect(
    screen.getByRole('heading', { name: /promover o meu comércio/i }),
  ).toBeInTheDocument()
}

async function fillRequiredFields(user) {
  const form = screen.getByRole('heading', { name: /promover o meu comércio/i })
    .closest('form')
  expect(form).toBeTruthy()
  const ui = within(form)
  await user.type(ui.getByLabelText(/nome/i), 'Tasca Teste')
  await user.type(ui.getByLabelText(/descrição/i), 'Petiscos e cerveja artesanal')
  await user.type(ui.getByLabelText(/morada/i), 'Rua Principal 1, Alcochete')
}

describe('Negocios form spam guards', () => {
  beforeEach(() => {
    localStorage.clear()
    insertMock.mockReset()
    orderMock.mockReset()
    insertMock.mockResolvedValue({ error: null })
    orderMock.mockResolvedValue({ data: [], error: null })
  })

  afterEach(() => {
    cleanup()
  })

  it('rejects honeypot silently without calling insert', async () => {
    const user = userEvent.setup()
    renderPage()
    await openPromoteForm(user)
    await fillRequiredFields(user)

    const honeypot = document.querySelector('#negocios_url_extra')
    expect(honeypot).toBeTruthy()
    await user.type(honeypot, 'http://bot.example')
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }))

    expect(insertMock).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/pedido enviado/i)
    })
  })

  it('blocks submit while cooldown is active', async () => {
    localStorage.setItem(FORM_SUBMIT_KEYS.negocios, String(Date.now()))
    const user = userEvent.setup()
    renderPage()
    await openPromoteForm(user)

    const submit = screen.getByRole('button', { name: /aguarda/i })
    expect(submit).toBeDisabled()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('calls insert on success and then enters cooldown', async () => {
    const user = userEvent.setup()
    renderPage()
    await openPromoteForm(user)
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }))

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1)
    })
    expect(insertMock.mock.calls[0][0]).toMatchObject({
      nome: 'Tasca Teste',
      aprovado: false,
    })
    expect(localStorage.getItem(FORM_SUBMIT_KEYS.negocios)).toBeTruthy()

    cleanup()
    renderPage()
    await openPromoteForm(user)

    expect(screen.getByRole('button', { name: /aguarda/i })).toBeDisabled()
  })

  it('shows rate-limit message when API rejects', async () => {
    insertMock.mockResolvedValue({ error: { message: 'rate limit exceeded' } })
    const user = userEvent.setup()
    renderPage()
    await openPromoteForm(user)
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /enviar pedido/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/demasiados pedidos/i)
    })
  })
})
