/** Deep link do comércio para o mapa. */

export function negocioHasMapCoords(n) {
  if (n?.lat == null || n?.lng == null || n?.lat === '' || n?.lng === '') {
    return false
  }
  return Number.isFinite(Number(n.lat)) && Number.isFinite(Number(n.lng))
}

/**
 * @param {string} negocioId
 * @returns {string}
 */
export function negocioMapPath(negocioId) {
  return `/mapa?comercio=1&negocio=${encodeURIComponent(String(negocioId || ''))}`
}

/** True quando a URL do mapa deve abrir comércio + focar um pin. */
export function parseMapComercioParams(searchParams) {
  const negocio = searchParams?.get?.('negocio') || null
  const comercioRaw = searchParams?.get?.('comercio')
  const showCommerce =
    comercioRaw === '1' ||
    comercioRaw === 'true' ||
    Boolean(negocio)
  return { showCommerce, negocioId: negocio }
}

/**
 * Coordenadas para centrar o mapa num negócio (`?negocio=`).
 * @returns {[number, number]|null}
 */
export function resolveNegocioFocusLatLng(businesses, negocioId) {
  if (!negocioId || !businesses?.length) return null
  const n = businesses.find((b) => b.id === negocioId)
  if (!n || !negocioHasMapCoords(n)) return null
  return [Number(n.lat), Number(n.lng)]
}
