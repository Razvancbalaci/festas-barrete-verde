import { createContext, useContext, useState, useEffect } from 'react'
import { translations } from '../data/i18n'

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('fbv-lang') || 'pt'
    } catch {
      return 'pt'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('fbv-lang', lang)
    } catch {
      /* ignore */
    }
  }, [lang])

  const t = translations[lang] || translations.pt

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}
