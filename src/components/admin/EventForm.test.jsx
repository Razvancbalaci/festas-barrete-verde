import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventForm from './EventForm'
import { translations } from '../../data/i18n'
import { FESTIVAL_DAYS } from '../../data/days'

const t = translations.pt.admin
const uiT = translations.pt

function formEl() {
  return screen.getByRole('button', { name: /^guardar$/i }).closest('form')
}

describe('EventForm', () => {
  it('validates required fields', async () => {
    const onSave = vi.fn()
    render(
      <EventForm event={null} onSave={onSave} onCancel={vi.fn()} t={t} uiT={uiT} />,
    )
    fireEvent.submit(formEl())
    expect(screen.getByRole('alert')).toHaveTextContent(/obrigat/i)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('rejects invalid time', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <EventForm event={null} onSave={onSave} onCancel={vi.fn()} t={t} uiT={uiT} />,
    )
    await user.type(screen.getByRole('textbox', { name: /^título$/i }), 'Show')
    const time = screen.getByRole('textbox', { name: /^hora$/i })
    await user.clear(time)
    await user.type(time, '99:99')
    fireEvent.submit(formEl())
    expect(screen.getByRole('alert')).toHaveTextContent(/hora/i)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('submits a valid payload', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue({})
    render(
      <EventForm
        event={{
          id: '1',
          dia: FESTIVAL_DAYS[0].date,
          hora: '20:00',
          titulo: 'Antigo',
          categoria: 'Música',
        }}
        onSave={onSave}
        onCancel={vi.fn()}
        t={t}
        uiT={uiT}
      />,
    )
    const title = screen.getByRole('textbox', { name: /^título$/i })
    await user.clear(title)
    await user.type(title, 'Novo Show')
    await user.click(screen.getByRole('button', { name: /^guardar$/i }))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalled()
    })
    expect(onSave.mock.calls[0][0]).toMatchObject({
      titulo: 'Novo Show',
      hora: '20:00',
      categoria: 'Música',
    })
    expect(onSave.mock.calls[0][1]).toBe('1')
  })
})
