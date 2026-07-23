/** Pontos do mapa geral das festas (Leaflet / OSM — sem Google). */
export const MAP_CENTER = [38.7548, -8.9618]
export const MAP_ZOOM = 15

/** Centro OSM da Praça de Touros de Alcochete (Av. 5 de Outubro / N119). */
export const PRACA_TOUROS = { lat: 38.75561, lng: -8.95553 }

export const MAP_PLACES = [
  {
    id: 'sede',
    nameKey: 'sede',
    name: 'Sede do Aposento',
    lat: 38.755349,
    lng: -8.963055,
    kind: 'ponto',
  },
  {
    id: 'igreja',
    nameKey: 'igreja',
    name: 'Igreja Matriz',
    lat: 38.756124,
    lng: -8.96028,
    kind: 'ponto',
  },
  {
    id: 'pavilhao',
    nameKey: 'pavilhao',
    name: 'Pavilhão Municipal',
    lat: 38.747627,
    lng: -8.967168,
    kind: 'ponto',
  },
  {
    id: 'rossio',
    nameKey: 'rossio',
    name: 'Jardim do Rossio',
    lat: 38.754176,
    lng: -8.964545,
    kind: 'ponto',
  },
  {
    id: 'armazem',
    nameKey: 'armazem',
    name: 'Antigo Armazém das Filmagens',
    lat: 38.75519,
    lng: -8.963924,
    kind: 'ponto',
  },
  {
    id: 'salineiro',
    nameKey: 'palcoSalineiro',
    name: 'Palco Salineiro',
    lat: 38.75555,
    lng: -8.96135,
    kind: 'palco',
  },
  {
    id: 'forcado',
    nameKey: 'palcoForcado',
    name: 'Palco Forcado',
    lat: 38.75495,
    lng: -8.96055,
    kind: 'palco',
  },
  {
    id: 'sjoao',
    nameKey: 'palcoSJoao',
    name: 'Palco S. João',
    lat: 38.75435,
    lng: -8.96005,
    kind: 'palco',
  },
  {
    id: 'coreto',
    nameKey: 'palcoCoreto',
    name: 'Palco Coreto',
    lat: 38.7551,
    lng: -8.9619,
    kind: 'palco',
  },
  {
    id: 'praca',
    nameKey: 'pracaTouros',
    name: 'Praça de Touros',
    lat: PRACA_TOUROS.lat,
    lng: PRACA_TOUROS.lng,
    kind: 'toiros',
  },
  {
    id: 'feira',
    nameKey: 'feiraCarrosseis',
    name: 'Feira dos Carrosséis',
    lat: 38.750396,
    lng: -8.968931,
    kind: 'feira',
  },
]

/** Percurso aproximado das entradas de toiros (ordem do cartaz). */
export const ENTRADA_ROUTE = [
  [38.753737, -8.965142], // Av. D. Manuel I
  [38.7558, -8.9622], // Rua da Quebrada
  [38.7552, -8.9614], // Rua José André dos Santos
  [38.7547, -8.9606], // Rua João de Deus
  [38.7544, -8.9602], // Largo Revolução 1910
  [38.75435, -8.96005], // Largo S. João
  [38.7552, -8.9568], // Av. 5 de Outubro
  [PRACA_TOUROS.lat, PRACA_TOUROS.lng], // Praça de Touros
]
