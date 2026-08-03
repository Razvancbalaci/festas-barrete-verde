import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LangProvider } from '../context/LangContext'
import AnalyticsTracker from './AnalyticsTracker'

const trackPageView = vi.fn()

vi.mock('../lib/analytics', () => ({
  track: vi.fn(),
  trackPageView: (...args) => trackPageView(...args),
}))

function mount(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LangProvider>
        <AnalyticsTracker />
        <Routes>
          <Route path="*" element={<div />} />
        </Routes>
      </LangProvider>
    </MemoryRouter>,
  )
}

describe('AnalyticsTracker', () => {
  it('tracks public page views', () => {
    trackPageView.mockClear()
    mount('/')
    expect(trackPageView).toHaveBeenCalledWith('/', expect.objectContaining({ lang: 'pt' }))
  })

  it('skips admin paths', () => {
    trackPageView.mockClear()
    mount('/admin')
    expect(trackPageView).not.toHaveBeenCalled()
  })
})
