/**
 * Camadas do mapa.
 *
 * Escolhe o estilo em https://cloud.maptiler.com/maps/ (abre um mapa → o ID
 * está no URL, ex. /maps/streets-v2/ → streets-v2).
 * Depois mete no .env: VITE_MAPTILER_STYLE=streets-v2 e reinicia o Vite.
 *
 * Sem VITE_MAPTILER_KEY: Carto Voyager (ruas) + Esri (satélite).
 */

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY?.trim() || ''

/** ID do mapa MapTiler (ex. bright-v2, streets-v2, voyager-v2, basic-v2, outdoor-v2). */
const MAPTILER_STYLE =
  import.meta.env.VITE_MAPTILER_STYLE?.trim() || 'dataviz-v4'

export const hasMapTiler = Boolean(MAPTILER_KEY)

const MAPTILER_ATTR =
  '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

function mapTilerRaster(mapId, ext = 'png') {
  return {
    url: `https://api.maptiler.com/maps/${mapId}/{z}/{x}/{y}.${ext}?key=${MAPTILER_KEY}`,
    attribution: MAPTILER_ATTR,
    maxZoom: 20,
    tileSize: 512,
    zoomOffset: -1,
  }
}

/** Fallback sem key — água azul, limpo. */
const CARTO_VOYAGER = {
  url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: 20,
  subdomains: 'abcd',
}

const ESRI_SAT = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution:
    'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
  maxZoom: 19,
}

export function getMapLayers() {
  if (!hasMapTiler) {
    return { streets: CARTO_VOYAGER, satellite: ESRI_SAT }
  }
  return {
    streets: mapTilerRaster(MAPTILER_STYLE, 'png'),
    satellite: mapTilerRaster('hybrid', 'jpg'),
  }
}
