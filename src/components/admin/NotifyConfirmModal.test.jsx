import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotifyConfirmModal from './NotifyConfirmModal'
import en from '../../data/i18n/en.js'

const t = en.admin

describe('NotifyConfirmModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <NotifyConfirmModal
        open={false}
        draft={{ mode: 'now', title: 'Oi', body: 'x' }}
        busy={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        t={t}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('confirms a simple send mode', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <NotifyConfirmModal
        open
        draft={{ mode: 'now', title: 'Aviso', body: 'Corpo', subscribers: 3 }}
        busy={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        t={t}
      />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: new RegExp(t.notifyConfirmAction, 'i') }),
    )
    expect(onConfirm).toHaveBeenCalled()
  })

  it('requires typed confirmation for deactivate_all', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const word = t.notifyDeactivateTypeWord
    render(
      <NotifyConfirmModal
        open
        draft={{ mode: 'deactivate_all', deviceCount: 10 }}
        busy={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        t={t}
      />,
    )
    const confirmBtn = screen.getByRole('button', {
      name: new RegExp(t.notifyDeactivateConfirm, 'i'),
    })
    expect(confirmBtn).toBeDisabled()
    await user.type(screen.getByRole('textbox'), word)
    expect(confirmBtn).not.toBeDisabled()
    await user.click(confirmBtn)
    expect(onConfirm).toHaveBeenCalled()
  })
})
