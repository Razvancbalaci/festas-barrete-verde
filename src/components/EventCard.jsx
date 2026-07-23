import { useState } from 'react'
import { ChevronDown, MapPin, Ticket } from 'lucide-react'
import { CATEGORY_COLORS } from '../data/categories'
import { useLang } from '../context/LangContext'

function mapsUrl(local) {
  const q = encodeURIComponent(`${local} Alcochete`)
  return `https://maps.google.com/?q=${q}`
}

/** Divide a descrição em secções (título em MAIÚSCULAS + linhas) */
function parseDescricao(text) {
  if (!text?.trim()) return []
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const sections = []
  let current = null

  for (const raw of lines) {
    const line = raw.trimEnd()
    const trimmed = line.trim()
    if (!trimmed) {
      if (current) current.items.push('')
      continue
    }
    const isHeading =
      trimmed === trimmed.toUpperCase() &&
      /[A-ZÀ-Ú]/.test(trimmed) &&
      trimmed.length < 40 &&
      !trimmed.includes('·')

    if (isHeading) {
      current = { title: trimmed, items: [] }
      sections.push(current)
    } else if (current) {
      current.items.push(trimmed)
    } else {
      current = { title: null, items: [trimmed] }
      sections.push(current)
    }
  }

  return sections.map((s) => ({
    ...s,
    items: s.items.filter((i, idx, arr) => i !== '' || (arr[idx - 1] && arr[idx - 1] !== '')),
  }))
}

export default function EventCard({ event, index }) {
  const { t } = useLang()
  const colors = CATEGORY_COLORS[event.categoria] || CATEGORY_COLORS.Institucional
  const hasDetails = Boolean(event.descricao?.trim() || event.bilhetes_url || event.subtitulo)
  const isCorrida =
    event.categoria === 'Toiros' &&
    (Boolean(event.bilhetes_url) ||
      /corrida|recortadores/i.test(event.titulo || ''))
  const [open, setOpen] = useState(false)
  const sections = parseDescricao(event.descricao)

  return (
    <article
      className={`animate-fade-up overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md ${
        isCorrida
          ? 'ring-2 ring-vermelho/25 shadow-vermelho/5'
          : 'ring-1 ring-barrete/5 shadow-barrete/5'
      }`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      {isCorrida && (
        <div className="bg-gradient-to-r from-vermelho to-[#A93226] px-4 py-1.5 text-center text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white">
          {t.corridaBadge}
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-3">
          <div
            className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-xl px-1 py-2 ${
              isCorrida ? 'bg-vermelho/10' : 'bg-barrete/8'
            }`}
          >
            <span
              className={`font-display text-base font-bold leading-none sm:text-lg ${
                isCorrida ? 'text-vermelho' : 'text-barrete'
              }`}
            >
              {event.hora}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-[0.95rem] font-semibold leading-snug text-ink sm:text-base">
                  {event.titulo}
                </h3>
                {event.subtitulo ? (
                  <p className="mt-0.5 text-sm font-medium text-vermelho/90">{event.subtitulo}</p>
                ) : null}
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {t.categories[event.categoria] || event.categoria}
              </span>
            </div>

            {event.local ? (
              <a
                href={mapsUrl(event.local)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-start gap-1.5 text-sm text-tejo transition-colors hover:text-barrete"
                title={t.openMaps}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span className="leading-snug underline-offset-2 hover:underline">
                  {event.local}
                </span>
              </a>
            ) : null}

            {(event.bilhetes_url || hasDetails) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {event.bilhetes_url ? (
                  <a
                    href={event.bilhetes_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-vermelho px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#A93226]"
                  >
                    <Ticket className="h-3.5 w-3.5" aria-hidden />
                    {t.buyTickets}
                  </a>
                ) : null}
                {event.descricao?.trim() ? (
                  <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-3.5 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-ink/10"
                    aria-expanded={open}
                  >
                    {open ? t.hideDetails : t.showDetails}
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {open && sections.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-barrete/10 pt-4 animate-fade-in">
            {sections.map((section, i) => (
              <div key={i}>
                {section.title ? (
                  <h4 className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-vermelho">
                    {section.title}
                  </h4>
                ) : null}
                <ul className="space-y-0.5">
                  {section.items.map((item, j) =>
                    item === '' ? (
                      <li key={j} className="h-1" aria-hidden />
                    ) : (
                      <li key={j} className="text-sm leading-snug text-ink/80">
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
