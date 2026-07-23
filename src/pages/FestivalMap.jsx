import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import { ArrowLeft, Contrast } from 'lucide-react'
import { useLang } from '../context/LangContext'
import { useA11y } from '../context/A11yContext'
import { MAP_CENTER, MAP_PLACES, MAP_ZOOM } from '../data/mapPlaces'
import { getMapLayers } from '../lib/mapTiles'
import Footer from '../components/Footer'
import 'leaflet/dist/leaflet.css'

const kindColor = {
  palco: '#1B6CA8',
  ponto: '#1B5E3F',
  toiros: '#C0392B',
  feira: '#E8A13A',
}

function pinIcon(kind) {
  const color = kindColor[kind] || kindColor.ponto
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path fill="${color}" stroke="#fff" stroke-width="2" d="M14 1c-6.6 0-12 5.2-12 11.6 0 8.7 12 25.4 12 25.4S26 21.3 26 12.6C26 6.2 20.6 1 14 1z"/>
      <circle cx="14" cy="12.5" r="4.5" fill="#fff"/>
    </svg>`
  )
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  })
}

function FitBounds({ places }) {
  const map = useMap()
  useEffect(() => {
    if (!places.length) return
    const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds.pad(0.15))
  }, [map, places])
  return null
}

export default function FestivalMap() {
  const { t } = useLang()
  const { a11y, toggleA11y } = useA11y()
  const m = t.map
  const layers = useMemo(() => getMapLayers(), [])
  const [basemap, setBasemap] = useState('streets')
  const active = layers[basemap] || layers.streets

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-barrete/10 bg-gradient-to-br from-barrete to-barrete-light text-white">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-white/75 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {m.back}
            </Link>
            <button
              type="button"
              onClick={toggleA11y}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                a11y
                  ? 'bg-dourado text-ink'
                  : 'bg-white/15 text-white/90 hover:bg-white/25'
              }`}
              aria-pressed={a11y}
              title={a11y ? t.a11yOff : t.a11yOn}
            >
              <Contrast className="h-3.5 w-3.5" aria-hidden />
              {a11y ? t.a11yShortOn : t.a11yShort}
            </button>
          </div>
          <h1 className="font-display text-2xl font-bold">{m.title}</h1>
          <p className="mt-1 text-sm text-white/80">{m.subtitle}</p>
          <ul className="mt-3 flex flex-wrap gap-3 text-[0.7rem] font-semibold uppercase tracking-wide text-white/85">
            <li className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-tejo" /> {m.legendStage}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-barrete-light" /> {m.legendPlace}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-vermelho" /> {m.legendBulls}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-dourado" /> {m.legendFair}
            </li>
          </ul>
        </div>
      </header>

      <div className="relative z-0 mx-auto w-full max-w-3xl flex-1 px-0 sm:px-6 sm:py-4">
        <div className="relative h-[min(70vh,560px)] w-full overflow-hidden sm:rounded-2xl sm:shadow-sm sm:ring-1 sm:ring-barrete/10">
          <div className="absolute right-3 top-3 z-[1000] flex overflow-hidden rounded-xl bg-white/95 text-xs font-bold shadow-md ring-1 ring-barrete/10 backdrop-blur">
            <button
              type="button"
              onClick={() => setBasemap('streets')}
              className={`px-3 py-2 transition ${
                basemap === 'streets'
                  ? 'bg-barrete text-white'
                  : 'text-ink/70 hover:bg-barrete/5'
              }`}
            >
              {m.layerMap}
            </button>
            <button
              type="button"
              onClick={() => setBasemap('satellite')}
              className={`px-3 py-2 transition ${
                basemap === 'satellite'
                  ? 'bg-barrete text-white'
                  : 'text-ink/70 hover:bg-barrete/5'
              }`}
            >
              {m.layerSatellite}
            </button>
          </div>

          <MapContainer
            center={MAP_CENTER}
            zoom={MAP_ZOOM}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              key={basemap}
              url={active.url}
              attribution={active.attribution}
              maxZoom={active.maxZoom ?? 19}
              {...(active.tileSize
                ? { tileSize: active.tileSize, zoomOffset: active.zoomOffset ?? 0 }
                : {})}
            />
            <FitBounds places={MAP_PLACES} />
            {MAP_PLACES.map((p) => (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.kind)}>
                <Popup>
                  <div className="min-w-[10rem] space-y-2 text-sm">
                    <strong className="block text-ink">
                      {m.places?.[p.nameKey] || p.name}
                    </strong>
                    <Link
                      to={`/?local=${encodeURIComponent(p.id)}`}
                      className="inline-flex font-semibold text-tejo underline-offset-2 hover:underline"
                    >
                      {m.seeEvents}
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <p className="px-4 pt-3 text-center text-xs text-ink/50 sm:px-0">{m.hint}</p>
      </div>

      <Footer />
    </div>
  )
}
