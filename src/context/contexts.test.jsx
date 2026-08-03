import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LangProvider, useLang } from './LangContext'
import { A11yProvider, useA11y } from './A11yContext'

const track = vi.fn()

vi.mock('../lib/analytics', () => ({
  track: (...args) => track(...args),
  trackPageView: vi.fn(),
}))

function LangProbe() {
  const { lang, setLang, t } = useLang()
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="title">{t.title}</span>
      <button type="button" onClick={() => setLang('en')}>
        en
      </button>
    </div>
  )
}

function A11yProbe() {
  const { a11y, toggleA11y } = useA11y()
  return (
    <button type="button" aria-pressed={a11y} onClick={toggleA11y}>
      toggle
    </button>
  )
}

describe('LangContext', () => {
  it('persists language changes', async () => {
    const user = userEvent.setup()
    localStorage.clear()
    render(
      <LangProvider>
        <LangProbe />
      </LangProvider>,
    )
    expect(screen.getByTestId('lang')).toHaveTextContent('pt')
    await user.click(screen.getByRole('button', { name: 'en' }))
    expect(screen.getByTestId('lang')).toHaveTextContent('en')
    expect(localStorage.getItem('fbv-lang')).toBe('en')
  })
})

describe('A11yContext', () => {
  it('toggles document class and storage', async () => {
    const user = userEvent.setup()
    localStorage.clear()
    document.documentElement.classList.remove('a11y')
    render(
      <A11yProvider>
        <A11yProbe />
      </A11yProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'toggle' }))
    expect(document.documentElement.classList.contains('a11y')).toBe(true)
    expect(localStorage.getItem('fbv-a11y')).toBe('1')
    expect(track).toHaveBeenCalledWith('a11y_toggle', { on: true })
  })
})
