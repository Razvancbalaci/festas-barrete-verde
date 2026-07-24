import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { track } from '../lib/analytics'

const A11yContext = createContext(null)
const STORAGE_KEY = 'fbv-a11y'

export function A11yProvider({ children }) {
  const [a11y, setA11yState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    document.documentElement.classList.toggle('a11y', a11y)
    try {
      localStorage.setItem(STORAGE_KEY, a11y ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [a11y])

  const setA11y = useCallback((value) => {
    setA11yState(Boolean(value))
  }, [])

  const toggleA11y = useCallback(() => {
    setA11yState((v) => {
      const next = !v
      track('a11y_toggle', { on: next })
      return next
    })
  }, [])

  return (
    <A11yContext.Provider value={{ a11y, setA11y, toggleA11y }}>
      {children}
    </A11yContext.Provider>
  )
}

export function useA11y() {
  const ctx = useContext(A11yContext)
  if (!ctx) throw new Error('useA11y must be used within A11yProvider')
  return ctx
}
