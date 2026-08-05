import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoadErrorPanel from './LoadErrorPanel'

describe('LoadErrorPanel', () => {
  it('renders title and optional cached hint', () => {
    render(
      <LoadErrorPanel
        title="Não foi possível carregar"
        cachedHint="A mostrar dados em cache."
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível/i)
    expect(screen.getByText(/cache/i)).toBeInTheDocument()
  })

  it('calls onRetry and disables while retrying', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    const { rerender } = render(
      <LoadErrorPanel
        title="Erro"
        retryLabel="Tentar de novo"
        onRetry={onRetry}
      />,
    )
    await user.click(screen.getByRole('button', { name: /tentar de novo/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)

    rerender(
      <LoadErrorPanel
        title="Erro"
        retryLabel="Tentar de novo"
        onRetry={onRetry}
        retrying
      />,
    )
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeDisabled()
  })

  it('hides retry button when onRetry is missing', () => {
    render(<LoadErrorPanel title="Erro" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
