import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from './LoginForm'

const t = {
  title: 'Back-office',
  subtitle: 'Gestão',
  email: 'Email',
  password: 'Password',
  login: 'Entrar',
  errorRequired: 'Preenche os campos obrigatórios.',
  errorLogin: 'Login falhou.',
}

describe('LoginForm', () => {
  it('requires email and password', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<LoginForm onLogin={onLogin} t={t} />)
    await user.click(screen.getByRole('button', { name: /entrar/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/obrigatórios/i)
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('calls onLogin and shows API error', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn().mockResolvedValue({ error: { message: 'bad' } })
    render(<LoginForm onLogin={onLogin} t={t} />)
    await user.type(screen.getByRole('textbox', { name: /^email$/i }), 'a@b.com')
    await user.type(screen.getByLabelText(/^password$/i), 'secret')
    await user.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith('a@b.com', 'secret')
    })
    expect(screen.getByRole('alert')).toHaveTextContent(/login falhou/i)
  })

  it('succeeds without alert when onLogin returns ok', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn().mockResolvedValue({})
    render(<LoginForm onLogin={onLogin} t={t} />)
    await user.type(screen.getByRole('textbox', { name: /^email$/i }), 'a@b.com')
    await user.type(screen.getByLabelText(/^password$/i), 'secret')
    await user.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => expect(onLogin).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows session-expired notice when provided', () => {
    render(
      <LoginForm
        onLogin={vi.fn()}
        t={t}
        notice="Sessão terminada por inactividade."
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(/inactividade/i)
  })

  it('trims email before login', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn().mockResolvedValue({})
    render(<LoginForm onLogin={onLogin} t={t} />)
    await user.type(screen.getByRole('textbox', { name: /^email$/i }), '  a@b.com  ')
    await user.type(screen.getByLabelText(/^password$/i), 'secret')
    await user.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith('a@b.com', 'secret')
    })
  })
})
