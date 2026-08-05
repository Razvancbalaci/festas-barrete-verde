/**
 * Estilo dos pins do mapa (sem Leaflet) — círculo creme + borda + glyph.
 * Personalização por sítio: `place.emoji` e/ou `place.pinColor` em mapPlaces.
 */

export const MAP_PIN_FILL = '#FAF8F2'

/** Defaults por `kind` — border + glyph (+ fill/color/radius opcionais). */
export const MAP_PIN_KINDS = {
  palco: { border: '#1B6CA8', glyph: '🎤' },
  ponto: { border: '#1B5E3F', glyph: '📍' }, // alias legado
  local: { border: '#1B5E3F', glyph: '📍' },
  toiros: { border: '#C0392B', glyph: '🐂', iconKey: 'plaza' },
  feira: { border: '#E8A13A', glyph: '🎠' },
  comercio: { border: '#C45C26', glyph: '🍽️' },
  wc: { border: '#5B7C8A', glyph: '🚻' },
  /** Público — sinal clássico azul + P branco */
  estacionamento: {
    border: '#003D82',
    glyph: 'P',
    text: true,
    fill: '#0055A4',
    color: '#FFFFFF',
    radius: '22%',
    fontSize: 15,
  },
  /** Alias explícito do público */
  estacionamentoPublico: {
    border: '#003D82',
    glyph: 'P',
    text: true,
    fill: '#0055A4',
    color: '#FFFFFF',
    radius: '22%',
    fontSize: 15,
  },
  /** Privado / centros comerciais — P branco em verde */
  estacionamentoPrivado: {
    border: '#0E3D2C',
    glyph: 'P',
    text: true,
    fill: '#1B5E3F',
    color: '#FFFFFF',
    radius: '22%',
    fontSize: 15,
  },
  bull: { border: '#7A1F16', glyph: '🐂' },
  recinto: { border: '#C0392B', glyph: '🚧' },
}

/** Ícones SVG inline (não dependem de /public). */
export const PIN_ICON_HTML = {
  /** Praça de touros — anel visto de cima (arena + bancadas). */
  plaza: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="20" height="20" fill="none" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="#7A1F16" stroke="#4A1812" stroke-width="2"/><circle cx="32" cy="32" r="21" fill="#B85C50"/><circle cx="32" cy="32" r="13" fill="#E8C872" stroke="#C0392B" stroke-width="1.5"/><path d="M26 54 Q32 48 38 54" stroke="#4A1812" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>`,
  barrete: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="20" height="20" fill="none" aria-hidden="true"><path d="M12 56 L50 14" stroke="#2C1A0C" stroke-width="3.8" stroke-linecap="round"/><path d="M44 10 C50 14 52 20 48 24" stroke="#E8B84A" stroke-width="3.6" stroke-linecap="round" fill="none"/><path d="M48 10 C54 14 56 20 52 24" stroke="#E8B84A" stroke-width="3.6" stroke-linecap="round" fill="none"/><path d="M20 42 C18 30 26 18 40 20 C48 21 50 30 47 40 C46 42 22 44 20 42Z" fill="#1FA64A" stroke="#0E6B2E" stroke-width="1.6" stroke-linejoin="round"/><path d="M26 26 C14 20 8 28 14 36 C18 40 26 34 26 26Z" fill="#1FA64A" stroke="#0E6B2E" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="36" r="3.2" fill="#1FA64A" stroke="#0E6B2E" stroke-width="1.4"/><rect x="21" y="39" width="26" height="9" rx="2.2" fill="#D0212A" stroke="#8F141C" stroke-width="1.3"/></svg>`,
}

/** Resolve estilo visual para um kind (+ overrides). */
export function resolveMapPinStyle(kind, overrides = {}) {
  const base = MAP_PIN_KINDS[kind] || MAP_PIN_KINDS.local
  const border = overrides.border || overrides.pinColor || base.border
  const iconKey = overrides.iconKey || base.iconKey || null
  const iconHtml =
    overrides.iconHtml ||
    (iconKey ? PIN_ICON_HTML[iconKey] : null) ||
    null
  const iconSrc = !iconHtml
    ? overrides.iconSrc || base.iconSrc || null
    : null
  const glyph = iconHtml
    ? iconHtml
    : iconSrc
      ? `<img src="${iconSrc}" alt="" width="20" height="20" draggable="false" style="display:block;width:20px;height:20px;object-fit:contain;pointer-events:none" />`
      : overrides.glyph || overrides.emoji || base.glyph
  const text =
    overrides.text ??
    (iconHtml || iconSrc || overrides.glyph || overrides.emoji
      ? false
      : undefined) ??
    base.text ??
    false
  return {
    border,
    glyph,
    text: Boolean(text),
    fill: overrides.fill || base.fill || MAP_PIN_FILL,
    color: overrides.color || base.color || '#1a1a1a',
    radius: overrides.radius || base.radius || '50%',
    fontSize: overrides.fontSize || base.fontSize || null,
    iconSrc,
    iconKey,
  }
}

/**
 * @param {{ border?: string, glyph?: string, text?: boolean, fill?: string, color?: string, radius?: string, fontSize?: number|null, size?: number }} opts
 */
export function mapPinHtml({
  border = MAP_PIN_KINDS.local.border,
  glyph = '📍',
  text = false,
  fill = MAP_PIN_FILL,
  color = '#1a1a1a',
  radius = '50%',
  fontSize: fontSizeOpt = null,
  size = 32,
} = {}) {
  const fontSize = fontSizeOpt ?? (text ? 10 : 17)
  const weight = text ? '800' : '400'
  return `<div class="fbv-pin-face" style="width:${size}px;height:${size}px;border-radius:${radius};background:${fill};border:2px solid ${border};display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:${weight};line-height:1;letter-spacing:${text ? '-0.02em' : '0'};box-sizing:border-box;color:${color};font-family:system-ui,-apple-system,sans-serif" aria-hidden="true">${glyph}</div>`
}
