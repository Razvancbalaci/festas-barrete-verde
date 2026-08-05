import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { loadLocale, pt as ptLocale } from '../data/i18n'
import { track } from '../lib/analytics'

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('fbv-lang') || 'pt'
    } catch {
      return 'pt'
    }
  })
  const [t, setT] = useState(ptLocale)

  useEffect(() => {
    try {
      localStorage.setItem('fbv-lang', lang)
    } catch {
      /* ignore */
    }
  }, [lang])

  useEffect(() => {
    let cancelled = false
    if (lang === 'pt') {
      setT(ptLocale)
      return undefined
    }
    ;(async () => {
      const next = await loadLocale(lang)
      if (!cancelled) setT(next)
    })()
    return () => {
      cancelled = true
    }
  }, [lang])

  const setLangTracked = useCallback((next) => {
    setLang((prev) => {
      if (prev !== next) track('lang_change', { lang: next })
      return next
    })
  }, [])

  return (
    <LangContext.Provider value={{ lang, setLang: setLangTracked, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}
