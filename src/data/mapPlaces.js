import { isRouteMapEvent, isStreetBullEvent, parseLocations } from '../lib/locations'
import { routeFromPolygonRing } from '../lib/routeGeom'

/**
 * Locais do mapa geral das festas (Leaflet).
 * Coordenadas: preferência a GPS dados pelo projecto / Nominatim / fontes oficiais.
 * matchTerms: strings para filtrar eventos.local / título no programa.
 */
export const MAP_CENTER = [38.7554, -8.9615]
export const MAP_ZOOM = 16

/** Praça de Touros (relação OSM / Av. 5 de Outubro). */
export const PRACA_TOUROS = { lat: 38.75558936727605, lng: -8.95583129462169 }

/**
 * Estacionamento privado (centros comerciais): estilo + i18n ficam no código,
 * mas pins e legenda ficam off até haver coords / decisão de mostrar.
 */
export const MAP_SHOW_PRIVATE_PARKING = false

export function isMapPlaceVisible(place) {
  if (!place || place.hidden) return false
  if (
    !MAP_SHOW_PRIVATE_PARKING &&
    place.kind === 'estacionamentoPrivado'
  ) {
    return false
  }
  return true
}

export function visibleMapPlaces(places = MAP_PLACES) {
  return places.filter(isMapPlaceVisible)
}

export const MAP_PLACES = [
  {
    id: 'sede',
    nameKey: 'sede',
    name: 'Sede do Aposento',
    lat: 38.755349,
    lng: -8.963055,
    kind: 'local',
    iconKey: 'barrete',
    matchTerms: ['Sede do Aposento', 'em frente à sede'],
  },
  {
    id: 'igreja',
    nameKey: 'igreja',
    name: 'Igreja Matriz',
    lat: 38.75618,
    lng: -8.960071,
    kind: 'local',
    emoji: '⛪',
    matchTerms: ['Igreja Matriz'],
  },
  {
    id: 'pavilhao',
    nameKey: 'pavilhao',
    name: 'Pavilhão Municipal',
    lat: 38.747627,
    lng: -8.967168,
    kind: 'local',
    emoji: '🏟️',
    matchTerms: ['Pavilhão Municipal'],
  },
  {
    id: 'rossio',
    nameKey: 'rossio',
    name: 'Jardim do Rossio',
    lat: 38.754176,
    lng: -8.964545,
    kind: 'local',
    emoji: '🌳',
    matchTerms: ['Rossio'],
  },
  {
    id: 'armazem',
    nameKey: 'armazem',
    name: 'Antigo Armazém das Filmagens',
    lat: 38.75519,
    lng: -8.963924,
    kind: 'local',
    emoji: '🎬',
    matchTerms: ['Armazém das Filmagens', 'Filmagens'],
  },
  {
    id: 'salineiro',
    nameKey: 'palcoSalineiro',
    name: 'Palco Salineiro',
    lat: 38.755822,
    lng: -8.962264,
    kind: 'palco',
    matchTerms: ['Palco Salineiro'],
  },
  {
    id: 'forcado',
    nameKey: 'palcoForcado',
    name: 'Palco Forcado',
    lat: 38.755314,
    lng: -8.962095,
    kind: 'palco',
    matchTerms: ['Palco Forcado'],
  },
  {
    id: 'sjoao',
    nameKey: 'palcoSJoao',
    name: 'Palco S. João',
    lat: 38.756124,
    lng: -8.96028,
    kind: 'palco',
    matchTerms: ['Palco S. João', 'Palco São João', 'Palco S.João'],
  },
  {
    id: 'coreto',
    nameKey: 'palcoCoreto',
    name: 'Palco Coreto',
    lat: 38.756493,
    lng: -8.959684,
    kind: 'palco',
    matchTerms: ['Palco Coreto'],
  },
  {
    id: 'passeio-tejo',
    nameKey: 'passeioTejo',
    name: 'Passeio do Tejo',
    lat: 38.75685,
    lng: -8.95795,
    kind: 'local',
    emoji: '🎆',
    matchTerms: ['Passeio do Tejo', 'Piromusical', 'Pirotecnia'],
  },
  {
    id: 'praca',
    nameKey: 'pracaTouros',
    name: 'Praça de Touros',
    lat: PRACA_TOUROS.lat,
    lng: PRACA_TOUROS.lng,
    kind: 'toiros',
    matchTerms: ['Praça de Touros'],
  },
  {
    id: 'feira',
    nameKey: 'feiraCarrosseis',
    name: 'Feira dos Carrosséis',
    lat: 38.750396,
    lng: -8.968931,
    kind: 'feira',
    matchTerms: ['Feira dos Carrosséis', 'Carrosséis', 'Carrosseis'],
  },
  {
    id: 'wc-publico',
    nameKey: 'wcPublico',
    name: 'Instalações Sanitárias Públicas',
    lat: 38.756166,
    lng: -8.959483,
    kind: 'wc',
    matchTerms: [],
  },
  {
    id: 'wc-portatil-1',
    nameKey: 'wcPortatil1',
    name: 'Casas de banho portáteis',
    lat: 38.75541801464603,
    lng: -8.964004411300179,
    kind: 'wc',
    matchTerms: [],
  },
  {
    id: 'wc-portatil-2',
    nameKey: 'wcPortatil2',
    name: 'Casas de banho portáteis',
    lat: 38.75615914019753,
    lng: -8.961076834719945,
    kind: 'wc',
    matchTerms: [],
  },
  {
    id: 'estacionamento-1',
    nameKey: 'estacionamentoPublico1',
    name: 'Estacionamento público',
    lat: 38.75636806255362,
    lng: -8.957217155731923,
    kind: 'estacionamentoPublico',
    matchTerms: [],
  },
]

export function getMapPlace(id) {
  return MAP_PLACES.find((p) => p.id === id) || null
}

/** Match de termo com limites aproximados de palavra (evita "ao forcado" ⊃ "o forcado"). */
export function includesTerm(hay, term) {
  if (!hay || !term) return false
  const h = String(hay).toLowerCase()
  const t = String(term).toLowerCase()
  let idx = 0
  while ((idx = h.indexOf(t, idx)) !== -1) {
    const before = idx === 0 ? ' ' : h[idx - 1]
    const after = idx + t.length >= h.length ? ' ' : h[idx + t.length]
    const border = /[^\p{L}\p{N}]/u
    if (border.test(before) && border.test(after)) return true
    idx += 1
  }
  return false
}

function isVenueTerm(term) {
  return /palco|pavilh[aã]o municipal|armaz[eé]m|sede|igreja|rossio|feira dos|carross|pra[cç]a de touros|filmagens/i.test(
    term
  )
}

/**
 * Evento associado a um ponto do mapa.
 * Prefere `local`; título só para termos de venue claros.
 * Rotas de toiros (várias ruas) não associam a um palco só porque a rua passa lá.
 */
export function eventMatchesPlace(event, place) {
  if (!place?.matchTerms?.length) return false

  const local = event.local || ''
  const title = event.titulo || ''
  const streets = parseLocations(local)
  const routeLike =
    isRouteMapEvent(event) ||
    (isStreetBullEvent(event) && streets.length >= 2) ||
    streets.length >= 3

  if (routeLike && (place.kind === 'palco' || place.kind === 'toiros')) {
    return place.matchTerms.some(
      (term) => isVenueTerm(term) && includesTerm(local, term)
    )
  }

  return place.matchTerms.some((term) => {
    if (includesTerm(local, term)) return true
    if (isVenueTerm(term) && includesTerm(title, term)) return true
    return false
  })
}

/** Percurso das entradas (GPS do projecto → portão na Av. 5 de Outubro). */
export const ENTRADA_ROUTE = [
  [38.753653, -8.965251],
  [38.755386, -8.963838],
  [38.755398, -8.963246],
  [38.755392, -8.963178],
  [38.755274, -8.962905],
  [38.754754, -8.962253],
  [38.755089, -8.961776],
  [38.755687, -8.961567],
  [38.756019, -8.960465],
  [38.756038, -8.956092],
  [38.755795489178034, -8.9557509571414],
]

/** Chegada da entrada (portão na avenida — não o centro OSM da praça). */
export const ENTRADA_DEST = ENTRADA_ROUTE[ENTRADA_ROUTE.length - 1]

/** Ruas do percurso típico das entradas (cartaz → portão da Praça). */
export const ENTRADA_ROUTE_STREETS = [
  'Av. D. Manuel I',
  'Rua da Quebrada',
  'Rua José André dos Santos',
  'Rua João de Deus',
  'Largo da Revolução de 1910',
  'Largo de S. João',
  'Av. 5 de Outubro',
  'Nacional 119',
]

/** Campo `local` completo para entradas no programa / smoke test. */
export const ENTRADA_ROUTE_LOCAL = ENTRADA_ROUTE_STREETS.join(', ')

/**
 * Recintos das largadas — GeoJSON do utilizador + match ao `local` do cartaz.
 * O percurso do toiro (ida/volta) deriva do GPS do polígono.
 */
export const LARGADA_RECINTOS = [
  {
    id: 'largada-quebrada',
    nameKey: 'recintoQuebrada',
    hintKey: 'recintoQuebradaHint',
    match: /quebrada|jos[eé]\s*andr[eé]|andr[eé]\s+dos\s+santos/i,
    positions: [
      [38.7553571, -8.9631805],
      [38.7551155, -8.9627364],
      [38.7547503, -8.9622818],
      [38.7547317, -8.9622493],
      [38.7548482, -8.9620957],
      [38.7548768, -8.9621563],
      [38.7547975, -8.9622515],
      [38.7551693, -8.9627224],
      [38.7554013, -8.9631206],
    ],
  },
  {
    id: 'largada-5outubro',
    nameKey: 'recinto5Outubro',
    hintKey: 'recinto5OutubroHint',
    match: /5\s*(de\s+)?outubro|av\.?\s*5/i,
    positions: [
      [38.7559609, -8.9603317],
      [38.7560394, -8.9603405],
      [38.7560497, -8.9593856],
      [38.7560565, -8.9579139],
      [38.7559096, -8.9579183],
      [38.7559301, -8.9593331],
      [38.7559574, -8.9603273],
    ],
  },
]

/**
 * Recintos das largadas — animação vagueia dentro do polígono GPS.
 */
export const LARGADA_STREET_ROUTES = LARGADA_RECINTOS.map((r) => ({
  id: r.id,
  nameKey: r.nameKey,
  match: r.match,
  polygon: r.positions,
  route: routeFromPolygonRing(r.positions),
}))

/** @deprecated use LARGADA_STREET_ROUTES */
export const LARGADA_ROUTE = LARGADA_STREET_ROUTES.flatMap((s) => s.route)

/** @deprecated use LARGADA_RECINTOS */
export const LARGADA_RECINTO = LARGADA_RECINTOS[0].positions

export const LARGADA_RECINTO_LATLNGS = LARGADA_RECINTOS.flatMap((z) => z.positions)
