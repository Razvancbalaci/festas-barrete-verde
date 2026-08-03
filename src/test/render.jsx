import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LangProvider } from '../context/LangContext'
import { A11yProvider } from '../context/A11yContext'

/**
 * Providers padrão para testes de UI pública.
 * @param {import('react').ReactNode} ui
 * @param {{ route?: string, initialEntries?: string[] }} [options]
 */
export function renderApp(ui, options = {}) {
  const entries = options.initialEntries || [options.route || '/']
  return render(
    <MemoryRouter initialEntries={entries}>
      <LangProvider>
        <A11yProvider>{ui}</A11yProvider>
      </LangProvider>
    </MemoryRouter>,
  )
}

export function sampleEvent(overrides = {}) {
  return {
    id: 'evt-1',
    dia: '2026-08-07',
    hora: '21:00',
    titulo: 'Concerto de Abertura',
    subtitulo: null,
    local: 'Palco Principal',
    categoria: 'Música',
    ordem: 1,
    descricao: 'Um concerto especial.',
    bilhetes_url: null,
    ...overrides,
  }
}
