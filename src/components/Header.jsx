import { Contrast } from 'lucide-react'
import { LANGS } from '../data/i18n'
import { useLang } from '../context/LangContext'
import { useA11y } from '../context/A11yContext'

export default function Header() {
  const { lang, setLang, t } = useLang()
  const { a11y, toggleA11y } = useA11y()

  return (
    <header className="relative overflow-hidden border-b border-barrete/10">
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

      <div className="relative mx-auto max-w-3xl px-4 pb-8 pt-5 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={toggleA11y}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
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
          <div
            className="inline-flex rounded-full bg-white/15 p-1 backdrop-blur-sm"
            role="group"
            aria-label="Language"
          >
            {LANGS.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={`rounded-full px-2.5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 sm:px-3 ${
                  lang === code
                    ? 'bg-white text-barrete shadow-sm'
                    : 'text-white/85 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="animate-fade-up text-center">
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-dourado">
            Alcochete · 2026
          </p>
          <h1 className="font-display text-[1.65rem] font-bold leading-tight text-white sm:text-3xl md:text-4xl">
            {t.title}
          </h1>
          <p className="mt-3 text-sm font-medium text-white/85 sm:text-base">
            {t.subtitle}
          </p>
          <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-dourado" />
        </div>
      </div>
    </header>
  )
}
