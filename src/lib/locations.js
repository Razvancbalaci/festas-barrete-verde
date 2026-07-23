/** Heurística: parte de morada que parece uma via mapeável */
const STREET_START =
  /^(Av\.|Avenida|Rua|Largo|Praça|Travessa|Estrada|Nacional|EN|N\s?\d|O Forcado|Coreto)/i

/**
 * Nomes do cartaz → sítio que o Google Maps encontra bem em Alcochete.
 * Coordenadas: lat,lng (sem acrescentar ", Alcochete").
 */
const PLACE_ALIASES = {
  'Palco Salineiro': '38.755822,-8.962264',
  'Palco Forcado': '38.755314,-8.962095',
  'Palco S. João': '38.756038,-8.960828',
  'Palco São João': '38.756038,-8.960828',
  'Palco S.João': '38.756038,-8.960828',
  'Palco Coreto': '38.756493,-8.959684',
  'Praça de Touros': '38.755608,-8.95553',
  'Praça de Touros de Alcochete': '38.755608,-8.95553',
  'Feira dos Carrosséis': '38.750396,-8.968931',
  'Av. D. Manuel I': '38.753737,-8.965142',
  'Avenida D. Manuel I': '38.753737,-8.965142',
  'Avenida Dom Manuel I': '38.753737,-8.965142',
  'Av. Dom Manuel I': '38.753737,-8.965142',
  'Rua da Quebrada': '38.755386,-8.963509',
  'Rua José André dos Santos': '38.755115,-8.962691',
  'Rua João de Deus': '38.755521,-8.961591',
  'Largo da Revolução 1910': '38.755835,-8.96148',
  'Largo da Revolução de 1910': '38.755835,-8.96148',
  'Largo de S. João': '38.756038,-8.960828',
  'Largo de São João': '38.756038,-8.960828',
  'Av. 5 de Outubro': '38.756045,-8.956002',
  'Avenida 5 de Outubro': '38.756045,-8.956002',
  'O Forcado': '38.755314,-8.962095',
  'Largo João da Horta': '38.755314,-8.962095',
  'Largo da República': '38.755822,-8.962264',
  'em frente à sede': '38.755349,-8.963055',
  'Sede do Aposento do Barrete Verde': '38.755349,-8.963055',
  'junto à Igreja Matriz': '38.756124,-8.960280',
  'junto ao Pavilhão Municipal de Alcochete': '38.747627,-8.967168',
  'Jardim do Rossio': '38.754176,-8.964545',
  'Antigo Armazém das Filmagens': '38.755190,-8.963924',
  'Instalações Sanitárias Públicas': '38.756166,-8.959483',
  'Nacional 119': '38.755608,-8.95553',
  'EN 119': '38.755608,-8.95553',
  'N 119': '38.755608,-8.95553',
  N119: '38.755608,-8.95553',
}

/** Rótulos amigáveis no ecrã (o Maps continua a usar PLACE_ALIASES) */
const DISPLAY_LABELS = {
  'Nacional 119': 'Nacional 119 (Praça de Touros)',
  'EN 119': 'EN 119 (Praça de Touros)',
  'N 119': 'N 119 (Praça de Touros)',
  N119: 'N119 (Praça de Touros)',
}

export function displayPlace(name) {
  const key = name?.trim()
  return DISPLAY_LABELS[key] || key
}

export function mapsPlace(name) {
  const key = name?.trim()
  return PLACE_ALIASES[key] || key
}

function isLatLng(value) {
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(String(value).trim())
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
  const andSplit =
    /\s+e\s+(?=Av\.|Avenida|Rua|Largo|Praça|Nacional|EN\b|O Forcado|Coreto)/i
  const hasStreetAnd = andSplit.test(trimmed)

  if (!hasComma && !hasStreetAnd) {
    return [trimmed]
  }

  const byComma = trimmed.split(/\s*,\s*/)
  const streets = []

  for (const part of byComma) {
    const sub = part
      .split(andSplit)
      .map((s) => s.trim())
      .filter(Boolean)
    streets.push(...sub)
  }

  return streets.length > 0 ? streets : [trimmed]
}

export function mapsUrl(place) {
  const resolved = mapsPlace(place)
  const q =
    isLatLng(resolved) || /Alcochete/i.test(resolved)
      ? resolved
      : `${resolved}, Alcochete`
  return `https://maps.google.com/?q=${encodeURIComponent(q)}`
}

function mapsQuery(place) {
  const resolved = mapsPlace(place)
  if (isLatLng(resolved) || /Alcochete/i.test(resolved)) return resolved
  return `${resolved}, Alcochete`
}

/** Direcções a pé até um ponto (origem = localização actual do Maps). */
export function mapsWalkToUrl(lat, lng) {
  const params = new URLSearchParams({
    api: '1',
    destination: `${lat},${lng}`,
    travelmode: 'walking',
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
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

/** Percurso no Maps: entradas, prova do boi, ou 3+ vias no `local`. */
export function isRouteMapEvent(event) {
  if (/entrada|boi da guia/i.test(event.titulo || '')) return true
  return parseLocations(event.local).length >= 3
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
