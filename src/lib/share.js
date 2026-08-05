/** URL canónica para partilhar um evento (WhatsApp / redes). */
export const SITE_ORIGIN = 'https://www.festasbarreteverde.pt'

/**
 * Deep link estável: sempre dia + evento no domínio público.
 * @param {{ id: string, dia: string }} event
 * @param {{ origin?: string }} [opts] — só para testes
 */
export function eventShareUrl(event, opts = {}) {
  const origin = String(opts.origin || SITE_ORIGIN).replace(/\/$/, '')
  const dia = encodeURIComponent(event?.dia || '')
  const id = encodeURIComponent(event?.id || '')
  return `${origin}/?dia=${dia}&evento=${id}`
}

/** Texto curto para partilha nativa / clipboard. */
export function eventShareText(event) {
  const hora = event?.hora || ''
  const titulo = event?.titulo || ''
  const local = event?.local ? ` — ${event.local}` : ''
  return `${hora} · ${titulo}${local}`
}
