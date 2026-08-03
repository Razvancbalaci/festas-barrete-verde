import { useEffect, useId, useRef, useState } from 'react'
import { Contrast, Globe } from 'lucide-react'
import { LANGS } from '../data/i18n'
import { useLang } from '../context/LangContext'
import { useA11y } from '../context/A11yContext'

function LangGlobe() {
  const { lang, setLang, t } = useLang()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const menuId = useId()
  const current = LANGS.find((l) => l.code === lang) || LANGS[0]

  useEffect(() => {
    if (!open) return
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={menuId}
        aria-label={t.langMenu || 'Language'}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/25"
      >
        <Globe className="h-3.5 w-3.5" aria-hidden />
        <span className="tracking-wide">{current.label}</span>
      </button>
      {open ? (
        <ul
          id={menuId}
          role="listbox"
          className="absolute right-0 z-30 mt-1.5 min-w-[7.5rem] overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-barrete/10"
        >
          {LANGS.map(({ code, label }) => (
            <li key={code} role="option" aria-selected={lang === code}>
              <button
                type="button"
                onClick={() => {
                  setLang(code)
                  setOpen(false)
                }}
                className={`flex w-full px-3 py-2 text-left text-sm font-semibold transition ${
                  lang === code
                    ? 'bg-barrete/10 text-barrete'
                    : 'text-ink/80 hover:bg-barrete/5'
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export default function Header() {
  const { t } = useLang()
  const { a11y, toggleA11y } = useA11y()

  return (
    <header
      className="relative overflow-hidden border-b border-barrete/10"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            'linear-gradient(135deg, #1B5E3F 0%, #2E7D53 45%, #1B5E3F 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0L22 18H40L24 26L30 44L20 32L10 44L16 26L0 18H18L20 0Z' fill='%23E8A13A' fill-opacity='0.35'/%3E%3C/svg%3E\")",
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative mx-auto max-w-3xl px-4 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-4">
        <div className="mb-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={toggleA11y}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${
              a11y
                ? 'bg-dourado text-ink shadow-sm'
                : 'bg-white/15 text-white/90 backdrop-blur-sm hover:bg-white/25'
            }`}
            aria-pressed={a11y}
            title={a11y ? t.a11yOff : t.a11yOn}
          >
            <Contrast className="h-3.5 w-3.5" aria-hidden />
            {a11y ? t.a11yShortOn : t.a11yShort}
          </button>
          <LangGlobe />
        </div>

        <div className="animate-fade-up text-center">
          <img
            src="/mark.svg"
            alt=""
            width={52}
            height={52}
            className="mx-auto mb-2 h-12 w-12 rounded-xl shadow-md shadow-black/20 ring-2 ring-dourado/40 sm:h-14 sm:w-14"
            decoding="async"
          />
          <h1 className="font-display text-[1.35rem] font-bold leading-tight text-white sm:text-2xl md:text-3xl">
            {t.title}
          </h1>
          <p className="mt-1.5 text-xs font-medium text-white/85 sm:text-sm">
            {t.subtitle}
          </p>
          <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-dourado" />
        </div>
      </div>
    </header>
  )
}
