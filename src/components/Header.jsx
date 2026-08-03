import { Contrast } from 'lucide-react'
import { LANGS } from '../data/i18n'
import { useLang } from '../context/LangContext'
import { useA11y } from '../context/A11yContext'

function LangAndA11y({ compact }) {
  const { lang, setLang, t } = useLang()
  const { a11y, toggleA11y } = useA11y()

  return (
    <div
      className={`flex flex-wrap items-center justify-end gap-2 ${
        compact ? 'shrink-0' : ''
      }`}
    >
      <button
        type="button"
        onClick={toggleA11y}
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition ${
          compact ? 'px-2.5 py-1.5 text-[0.7rem]' : 'px-3 py-1.5 text-xs'
        } ${
          a11y
            ? 'bg-dourado text-ink shadow-sm'
            : 'bg-white/15 text-white/90 backdrop-blur-sm hover:bg-white/25'
        }`}
        aria-pressed={a11y}
        title={a11y ? t.a11yOff : t.a11yOn}
      >
        <Contrast className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
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
            className={`rounded-full font-semibold tracking-wide transition-all duration-200 ${
              compact ? 'px-2 py-1 text-[0.7rem]' : 'px-2.5 py-1.5 text-xs sm:px-3'
            } ${
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
  )
}

export default function Header() {
  const { t } = useLang()

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

      {/* Mobile: marca compacta + controlos numa faixa baixa */}
      <div className="relative mx-auto max-w-3xl px-4 py-3 sm:hidden">
        <div className="flex items-center gap-3">
          <img
            src="/mark.svg"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-xl shadow-md shadow-black/20 ring-2 ring-dourado/40"
            decoding="async"
          />
          <div className="min-w-0 flex-1 animate-fade-up">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-dourado">
              Alcochete · 2026
            </p>
            <h1 className="font-display text-[1.05rem] font-bold leading-tight text-white">
              {t.titleShort || t.title}
            </h1>
          </div>
        </div>
        <div className="mt-2.5 flex justify-end">
          <LangAndA11y compact />
        </div>
      </div>

      {/* Desktop / tablet: hero completo */}
      <div className="relative mx-auto hidden max-w-3xl px-4 pb-8 pt-5 sm:block sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
          <LangAndA11y />
        </div>

        <div className="animate-fade-up text-center">
          <img
            src="/mark.svg"
            alt=""
            width={72}
            height={72}
            className="mx-auto mb-4 h-[4.5rem] w-[4.5rem] rounded-2xl shadow-lg shadow-black/20 ring-2 ring-dourado/40"
            decoding="async"
          />
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
