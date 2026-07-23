/** Heurística: parte de morada que parece uma via mapeável */
const STREET_START =
  /^(Av\.|Avenida|Rua|Largo|Praça|Travessa|Estrada|Nacional|EN|N\s?\d|O Forcado|Coreto)/i

/**
 * Nomes do cartaz → sítio que o Google Maps encontra bem em Alcochete.
 */
const PLACE_ALIASES = {
  'Nacional 119': 'Praça de Touros de Alcochete',
  'EN 119': 'Praça de Touros de Alcochete',
  'N 119': 'Praça de Touros de Alcochete',
  N119: 'Praça de Touros de Alcochete',
  'Palco Salineiro': 'Largo da República 1, 2890-307 Alcochete',
  'Palco Forcado': 'O Forcado, Largo João da Horta, 2890-047 Alcochete',
  'Palco S. João': 'Largo de São João 17, 2890-154 Alcochete',
  'Palco São João': 'Largo de São João 17, 2890-154 Alcochete',
  'Palco S.João': 'Largo de São João 17, 2890-154 Alcochete',
  'Palco Coreto': 'Coreto de Alcochete, Alcochete',
  'Praça de Touros': 'Praça de Touros de Alcochete',
}

export function displayPlace(name) {
  const key = name?.trim()
  return PLACE_ALIASES[key] || key
}

export function mapsPlace(name) {
  return displayPlace(name)
}

/**
 * Parte um `local` com várias vias (vírgulas / " e ") em moradas individuais
 * para o Google Maps. Locais únicos (ex. "Praça de Touros") ficam intactos.
 */
export function parseLocations(local) {
  if (!local?.trim()) return []

  const trimmed = local.trim()

  // Texto genérico sem vias concretas
  if (/^pelas ruas/i.test(trimmed) || /^ruas da vila$/i.test(trimmed)) {
    return []
  }

  const hasComma = trimmed.includes(',')
  const hasStreetAnd = /\s+e\s+(?=Av\.|Avenida|Rua|Largo|Praça|Nacional|EN\b)/i.test(
    trimmed
  )

  if (!hasComma && !hasStreetAnd) {
    return [trimmed]
  }

  const byComma = trimmed.split(/\s*,\s*/)
  const streets = []

  for (const part of byComma) {
    const sub = part
      .split(/\s+e\s+(?=Av\.|Avenida|Rua|Largo|Praça|Nacional|EN\b)/i)
      .map((s) => s.trim())
      .filter(Boolean)
    streets.push(...sub)
  }

  return streets.length > 0 ? streets : [trimmed]
}

export function mapsUrl(place) {
  const resolved = mapsPlace(place)
  const q = /Alcochete/i.test(resolved)
    ? resolved
    : `${resolved}, Alcochete`
  return `https://maps.google.com/?q=${encodeURIComponent(q)}`
}

function mapsQuery(place) {
  const resolved = mapsPlace(place)
  return /Alcochete/i.test(resolved) ? resolved : `${resolved}, Alcochete`
}

/** Percurso Google Maps: origem → waypoints → destino */
export function mapsDirectionsUrl(streets) {
  if (!streets?.length) return mapsUrl('Alcochete')
  if (streets.length === 1) return mapsUrl(streets[0])

  const origin = mapsQuery(streets[0])
  const destination = mapsQuery(streets[streets.length - 1])
  const middle = streets.slice(1, -1).map(mapsQuery)

  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'walking',
  })
  if (middle.length) {
    params.set('waypoints', middle.slice(0, 8).join('|'))
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/** Percurso no mapa (entradas + prova do boi) */
export function isRouteMapEvent(event) {
  return /entrada|boi da guia/i.test(event.titulo || '')
}

/** @deprecated use isRouteMapEvent */
export function isEntradaRouteEvent(event) {
  return isRouteMapEvent(event)
}

/** Corrida / concurso na praça (bilhetes) — não é passagem nas ruas */
export function isCorridaEvent(event) {
  return (
    event.categoria === 'Toiros' &&
    (Boolean(event.bilhetes_url) ||
      /corrida|recortadores/i.test(event.titulo || ''))
  )
}

/**
 * Entradas, largadas, recolhas e prova do boi — aviso de cuidado (ao clicar).
 */
export function isStreetBullEvent(event) {
  if (event.categoria !== 'Toiros') return false
  if (isCorridaEvent(event)) return false
  return /entrada|largada|recolha|boi da guia|vacas|campinagem|pegar|bezerros|esperas/i.test(
    event.titulo || ''
  )
}

export function isMappableStreet(name) {
  return STREET_START.test(name.trim())
}
