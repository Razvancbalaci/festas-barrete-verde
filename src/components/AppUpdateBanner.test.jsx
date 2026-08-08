import { describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '../test/render'
import AppUpdateBanner, { SW_UPDATE_EVENT } from './AppUpdateBanner'

describe('AppUpdateBanner', () => {
  it('stays hidden until an update event', () => {
    renderApp(<AppUpdateBanner />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows and reloads when update is offered', async () => {
    const user = userEvent.setup()
    const update = vi.fn()
    renderApp(<AppUpdateBanner />)
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(SW_UPDATE_EVENT, { detail: { update } }),
      )
    })
    expect(screen.getByRole('status')).toHaveTextContent(/versão nova|new version/i)
    await user.click(screen.getByRole('button', { name: /atualizar|update|reload/i }))
    expect(update).toHaveBeenCalled()
  })
})
