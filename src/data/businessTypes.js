/** Tipos de comércio local (fora do programa das festas) */
export const BUSINESS_TYPES = [
  'Restaurante',
  'Café / Bar',
  'Animação',
  'Barraquinha',
  'Loja',
  'Alojamento',
  'Outro',
]

/** Glyph + cor de borda por tipo (pins, legenda, filtros). */
export const BUSINESS_TYPE_STYLES = {
  Restaurante: { glyph: '🍽️', border: '#C45C26' },
  'Café / Bar': { glyph: '☕', border: '#8B5E3C' },
  Animação: { glyph: '🎧', border: '#6B3FA0' },
  Barraquinha: { glyph: '🍢', border: '#D4762C' },
  Loja: { glyph: '🛍️', border: '#2E6B8A' },
  Alojamento: { glyph: '🛏️', border: '#4A6FA5' },
  Outro: { glyph: '📌', border: '#9A6B4F' },
  /** Legado (já não selecccionável) */
  Serviço: { glyph: '📌', border: '#9A6B4F' },
}

export function businessTypeStyle(tipo) {
  return (
    BUSINESS_TYPE_STYLES[tipo] ||
    BUSINESS_TYPE_STYLES.Outro || { glyph: '🍽️', border: '#C45C26' }
  )
}

/** Chave de legenda do mapa para um tipo de comércio. */
export function commerceLegendKey(tipo) {
  return `comercio:${tipo}`
}

export function commerceTipoFromLegendKey(legendKey) {
  if (!legendKey?.startsWith('comercio:')) return null
  return legendKey.slice('comercio:'.length)
}

export function isCommerceLegendKey(legendKey) {
  return legendKey === 'comercio' || Boolean(commerceTipoFromLegendKey(legendKey))
}
