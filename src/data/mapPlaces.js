/**
 * Pontos do mapa geral das festas (Leaflet).
 * Coordenadas: preferência a GPS dados pelo projecto / Nominatim / fontes oficiais.
 * matchTerms: strings para filtrar eventos.local / título no programa.
 */
export const MAP_CENTER = [38.7554, -8.9615]
export const MAP_ZOOM = 16

/** Praça de Touros (relação OSM / Av. 5 de Outubro). */
export const PRACA_TOUROS = { lat: 38.755608, lng: -8.95553 }

export const MAP_PLACES = [
  {
    id: 'sede',
    nameKey: 'sede',
    name: 'Sede do Aposento',
    lat: 38.755349,
    lng: -8.963055,
    kind: 'ponto',
    matchTerms: ['Sede do Aposento', 'em frente à sede'],
  },
  {
    id: 'igreja',
    nameKey: 'igreja',
    name: 'Igreja Matriz',
    lat: 38.756124,
    lng: -8.96028,
    kind: 'ponto',
    matchTerms: ['Igreja Matriz'],
  },
  {
    id: 'pavilhao',
    nameKey: 'pavilhao',
    name: 'Pavilhão Municipal',
    lat: 38.747627,
    lng: -8.967168,
    kind: 'ponto',
    matchTerms: ['Pavilhão Municipal', 'Pavilhão'],
  },
  {
    id: 'rossio',
    nameKey: 'rossio',
    name: 'Jardim do Rossio',
    lat: 38.754176,
    lng: -8.964545,
    kind: 'ponto',
    matchTerms: ['Rossio'],
  },
  {
    id: 'armazem',
    nameKey: 'armazem',
    name: 'Antigo Armazém das Filmagens',
    lat: 38.75519,
    lng: -8.963924,
    kind: 'ponto',
    matchTerms: ['Armazém das Filmagens', 'Filmagens'],
  },
  {
    id: 'salineiro',
    nameKey: 'palcoSalineiro',
    name: 'Palco Salineiro',
    lat: 38.755822,
    lng: -8.962264,
    kind: 'palco',
    matchTerms: ['Palco Salineiro', 'Largo da República'],
  },
  {
    id: 'forcado',
    nameKey: 'palcoForcado',
    name: 'Palco Forcado',
    lat: 38.755314,
    lng: -8.962095,
    kind: 'palco',
    matchTerms: ['Palco Forcado', 'Largo João da Horta', 'O Forcado'],
  },
  {
    id: 'sjoao',
    nameKey: 'palcoSJoao',
    name: 'Palco S. João',
    lat: 38.756038,
    lng: -8.960828,
    kind: 'palco',
    matchTerms: [
      'Palco S. João',
      'Palco São João',
      'Palco S.João',
      'Largo de S. João',
      'Largo de São João',
    ],
  },
  {
    id: 'coreto',
    nameKey: 'palcoCoreto',
    name: 'Palco Coreto',
    lat: 38.756493,
    lng: -8.959684,
    kind: 'palco',
    matchTerms: ['Palco Coreto', 'Coreto'],
  },
  {
    id: 'praca',
    nameKey: 'pracaTouros',
    name: 'Praça de Touros',
    lat: PRACA_TOUROS.lat,
    lng: PRACA_TOUROS.lng,
    kind: 'toiros',
    matchTerms: [
      'Praça de Touros',
      'Nacional 119',
      'N119',
      'EN 119',
      'N 119',
    ],
  },
  {
    id: 'feira',
    nameKey: 'feiraCarrosseis',
    name: 'Feira dos Carrosséis',
    lat: 38.750396,
    lng: -8.968931,
    kind: 'feira',
    matchTerms: ['Feira', 'Carrosséis', 'Carrosseis'],
  },
]

export function getMapPlace(id) {
  return MAP_PLACES.find((p) => p.id === id) || null
}

/** Evento associado a um ponto do mapa (local / título). */
export function eventMatchesPlace(event, place) {
  if (!place?.matchTerms?.length) return false
  const hay = `${event.local || ''} ${event.titulo || ''}`.toLowerCase()
  return place.matchTerms.some((term) => hay.includes(String(term).toLowerCase()))
}

/** Percurso das entradas (vias do cartaz → Nominatim / GPS do projecto). */
export const ENTRADA_ROUTE = [
  [38.753737, -8.965142], // Av. D. Manuel I
  [38.755386, -8.963509], // Rua da Quebrada
  [38.755115, -8.962691], // Rua José André dos Santos
  [38.755521, -8.961591], // Rua João de Deus
  [38.755835, -8.96148], // Largo da Revolução de 1910
  [38.756038, -8.960828], // Largo de S. João
  [38.756045, -8.956002], // Av. 5 de Outubro
  [PRACA_TOUROS.lat, PRACA_TOUROS.lng], // Praça de Touros
]
