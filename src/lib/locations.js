/** Heurística: parte de morada que parece uma via mapeável */
const STREET_START =
  /^(Av\.|Avenida|Rua|Largo|Praça|Travessa|Estrada|Nacional|EN|N\s?\d)/i

/**
 * Nomes do cartaz → sítio que o Google Maps encontra bem em Alcochete.
 * (No programa, a N119 no fim das entradas corresponde à zona da Praça.)
 */
const PLACE_ALIASES = {
  'Nacional 119': 'Praça de Touros de Alcochete',
  'EN 119': 'Praça de Touros de Alcochete',
  'N 119': 'Praça de Touros de Alcochete',
  'N119': 'Praça de Touros de Alcochete',
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
  return `https://maps.google.com/?q=${encodeURIComponent(`${mapsPlace(place)}, Alcochete`)}`
}

/** Percurso Google Maps: origem → waypoints → destino (para Entradas) */
export function mapsDirectionsUrl(streets) {
  if (!streets?.length) return mapsUrl('Alcochete')
  if (streets.length === 1) return mapsUrl(streets[0])

  const withTown = (s) => `${mapsPlace(s)}, Alcochete`
  const origin = withTown(streets[0])
  const destination = withTown(streets[streets.length - 1])
  const middle = streets.slice(1, -1).map(withTown)

  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'walking',
  })
  if (middle.length) {
    // Google Maps aceita até ~10 waypoints na URL
    params.set('waypoints', middle.slice(0, 8).join('|'))
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/** Entrada de toiros (percurso longo) — mapa início→fim */
export function isEntradaRouteEvent(event) {
  return /entrada/i.test(event.titulo || '')
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
 * Entradas, largadas, recolhas e provas nas ruas — pedem aviso de cuidado.
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
