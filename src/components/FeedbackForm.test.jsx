import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FeedbackForm from './FeedbackForm'
import { LangProvider } from '../context/LangContext'
import { FORM_SUBMIT_KEYS } from '../lib/formSpamGuard'

const insertMock = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: (...args) => insertMock(...args),
    })),
  },
}))

vi.mock('../lib/analytics', () => ({
  track: vi.fn(),
}))

function renderForm(props = {}) {
  return render(
    <LangProvider>
      <FeedbackForm open onClose={vi.fn()} {...props} />
    </LangProvider>,
  )
}

function messageField() {
  return screen.getByRole('textbox', { name: /^mensagem$/i })
}

describe('FeedbackForm spam guards', () => {
  beforeEach(() => {
    localStorage.clear()
    insertMock.mockReset()
    insertMock.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('rejects honeypot silently without calling the API', async () => {
    const user = userEvent.setup()
    renderForm()

    const honeypot = document.querySelector('#feedback_url_extra')
    expect(honeypot).toBeTruthy()
    await user.type(honeypot, 'http://bot.example')
    await user.type(messageField(), 'mensagem válida suficiente')
    await user.click(screen.getByRole('button', { name: /enviar/i }))

    expect(insertMock).not.toHaveBeenCalled()
    expect(screen.getByText(/obrigado/i)).toBeInTheDocument()
  })

  it('blocks submit while cooldown is active', async () => {
    localStorage.setItem(FORM_SUBMIT_KEYS.feedback, String(Date.now()))
    renderForm()

    const submit = screen.getByRole('button', { name: /aguarda/i })
    expect(submit).toBeDisabled()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('calls insert on success and then enters cooldown', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(messageField(), 'mensagem válida suficiente')
    await user.click(screen.getByRole('button', { name: /^enviar$/i }))

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1)
    })
    expect(insertMock).toHaveBeenCalledWith({
      tipo: 'sugestao',
      mensagem: 'mensagem válida suficiente',
      contacto: null,
    })
    expect(screen.getByText(/obrigado/i)).toBeInTheDocument()
    expect(localStorage.getItem(FORM_SUBMIT_KEYS.feedback)).toBeTruthy()

    cleanup()
    renderForm()

    expect(screen.getByRole('button', { name: /aguarda/i })).toBeDisabled()
  })

  it('shows rate-limit message when API rejects', async () => {
    insertMock.mockResolvedValue({ error: { message: 'rate limit exceeded' } })
    const user = userEvent.setup()
    renderForm()

    await user.type(messageField(), 'mensagem válida suficiente')
    await user.click(screen.getByRole('button', { name: /^enviar$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/demasiados envios/i)
    })
  })
})
