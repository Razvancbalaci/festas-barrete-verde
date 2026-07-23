/**
 * Camadas do mapa.
 * - Com VITE_MAPTILER_KEY: ruas MapTiler (melhor estilo) + satélite MapTiler
 * - Sem key: OSM (ruas) + Esri World Imagery (satélite gratuito)
 */

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY?.trim() || ''

export const hasMapTiler = Boolean(MAPTILER_KEY)

const OSM = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
}

const MAPTILER_STREETS = {
  url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
  attribution:
    '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 20,
  tileSize: 512,
  zoomOffset: -1,
}

const MAPTILER_SAT = {
  url: `https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
  attribution:
    '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 20,
  tileSize: 512,
  zoomOffset: -1,
}

/** Satélite Esri — gratuito com atribuição (sem API key). */
const ESRI_SAT = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution:
    'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
  maxZoom: 19,
}

export function getMapLayers() {
  if (hasMapTiler) {
    return {
      streets: MAPTILER_STREETS,
      satellite: MAPTILER_SAT,
    }
  }
  return {
    streets: OSM,
    satellite: ESRI_SAT,
  }
}
