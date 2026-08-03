import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BusinessForm from './BusinessForm'
import { translations } from '../../data/i18n'

const t = translations.pt.admin
const typesT = translations.pt.businesses.types

describe('BusinessForm', () => {
  it('does not call onSave when required fields are empty', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <BusinessForm
        business={{ id: 'b1', nome: '', tipo: 'Restaurante', descricao: '', morada: '' }}
        onSave={onSave}
        onCancel={vi.fn()}
        t={t}
        typesT={typesT}
      />,
    )
    await user.click(screen.getByRole('button', { name: /^guardar$/i }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('rejects invalid website URL', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <BusinessForm
        business={{
          id: 'b1',
          nome: 'Tasca',
          tipo: 'Restaurante',
          descricao: 'Petiscos',
          morada: 'Rua 1',
          website: '',
        }}
        onSave={onSave}
        onCancel={vi.fn()}
        t={t}
        typesT={typesT}
      />,
    )
    await user.type(screen.getByRole('textbox', { name: /^website$/i }), 'javascript:alert(1)')
    fireEvent.submit(screen.getByRole('button', { name: /^guardar$/i }).closest('form'))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('saves sanitized payload', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue({})
    render(
      <BusinessForm
        business={{
          id: 'b1',
          nome: 'Tasca',
          tipo: 'Restaurante',
          descricao: 'Petiscos',
          morada: 'Rua 1',
          website: 'https://example.com',
        }}
        onSave={onSave}
        onCancel={vi.fn()}
        t={t}
        typesT={typesT}
      />,
    )
    await user.click(screen.getByRole('button', { name: /^guardar$/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).toMatchObject({
      nome: 'Tasca',
      website: 'https://example.com/',
    })
    expect(onSave.mock.calls[0][1]).toBe('b1')
  })
})
