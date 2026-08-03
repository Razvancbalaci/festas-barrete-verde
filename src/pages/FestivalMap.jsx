import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import { ArrowLeft, Contrast, Navigation } from 'lucide-react'
import { useLang } from '../context/LangContext'
import { useA11y } from '../context/A11yContext'
import {
  ENTRADA_ROUTE,
  LARGADA_RECINTO_LATLNGS,
  LARGADA_RECINTOS,
  MAP_CENTER,
  MAP_SHOW_PRIVATE_PARKING,
  MAP_ZOOM,
  visibleMapPlaces,
} from '../data/mapPlaces'
import { loadVisibleMapPlaces } from '../lib/mapPlaceOverrides'
import { mapsDriveToUrl, mapsWalkToUrl } from '../lib/locations'
import { track } from '../lib/analytics'
import { getMapLayers } from '../lib/mapTiles'
import { pinIconForPlace, resolveMapPinStyle } from '../lib/mapPinIcon'
import LiveBullLayer, {
  LiveNowBanners,
  useLiveStreetBull,
} from '../components/map/LiveBullLayer'
import LocateMeControl from '../components/map/LocateMeControl'
import Footer from '../components/Footer'
import 'leaflet/dist/leaflet.css'

/** Mini-pin igual ao do mapa (creme + borda + glyph). */
function LegendPin({ kind }) {
  const { border, glyph, text, fill, color, radius, fontSize } =
    resolveMapPinStyle(kind)
  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center border-2 leading-none shadow-sm"
      style={{
        background: fill,
        borderColor: border,
        borderRadius: radius,
        color,
        fontSize: fontSize ? Math.max(10, fontSize - 4) : text ? 8 : 13,
        fontWeight: text ? 800 : 400,
      }}
      aria-hidden
    >
      {glyph}
    </span>
  )
}

function LegendRecinto() {
  return (
    <span
      className="inline-block h-3.5 w-4 shrink-0 rounded-[3px]"
      style={{
        background: 'rgba(192, 57, 43, 0.28)',
        boxShadow: 'inset 0 0 0 1.5px #C0392B',
      }}
      aria-hidden
    />
  )
}

/** Traço discreto — alinhado com a polyline das entradas. */
function LegendRoute() {
  return (
    <span
      className="inline-block h-0 w-5 shrink-0 border-t-[2.5px] border-dashed"
      style={{ borderColor: 'rgba(192, 57, 43, 0.55)' }}
      aria-hidden
    />
  )
}

function FitBounds({ places, extraLatLngs = [] }) {
  const map = useMap()
  useEffect(() => {
    const pts = [
      ...places.map((p) => [p.lat, p.lng]),
      ...extraLatLngs,
    ]
    if (!pts.length) return
    const bounds = L.latLngBounds(pts)
    map.fitBounds(bounds.pad(0.15))
  }, [map, places, extraLatLngs])
  return null
}

export default function FestivalMap() {
  const { t } = useLang()
  const { a11y, toggleA11y } = useA11y()
  const m = t.map
  const layers = useMemo(() => getMapLayers(), [])
  const [basemap, setBasemap] = useState('streets')
  const active = layers[basemap] || layers.streets
  const live = useLiveStreetBull()
  const fitExtra = useMemo(
    () => [...LARGADA_RECINTO_LATLNGS, ...ENTRADA_ROUTE],
    []
  )
  const [places, setPlaces] = useState(() => visibleMapPlaces())

  useEffect(() => {
    let cancelled = false
    loadVisibleMapPlaces().then((res) => {
      if (cancelled) return
      setPlaces(res.places)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="border-b border-barrete/10 bg-gradient-to-br from-barrete to-barrete-light text-white"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
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
          <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-white/90">
            <li className="inline-flex items-center gap-2">
              <LegendPin kind="palco" /> {m.legendStage}
            </li>
            <li className="inline-flex items-center gap-2">
              <LegendPin kind="local" /> {m.legendPlace}
            </li>
            <li className="inline-flex items-center gap-2">
              <LegendPin kind="toiros" /> {m.legendBulls}
            </li>
            <li className="inline-flex items-center gap-2">
              <LegendRecinto /> {m.legendRecinto}
            </li>
            <li className="inline-flex items-center gap-2">
              <LegendRoute /> {m.legendRoute}
            </li>
            <li className="inline-flex items-center gap-2">
              <LegendPin kind="feira" /> {m.legendFair}
            </li>
            <li className="inline-flex items-center gap-2">
              <LegendPin kind="wc" /> {m.legendWc}
            </li>
            <li className="inline-flex items-center gap-2">
              <LegendPin kind="estacionamentoPublico" /> {m.legendParkingPublic}
            </li>
            {MAP_SHOW_PRIVATE_PARKING ? (
              <li className="inline-flex items-center gap-2">
                <LegendPin kind="estacionamentoPrivado" />{' '}
                {m.legendParkingPrivate}
              </li>
            ) : null}
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

          <LiveNowBanners labels={m} items={live.liveNow} />

          <MapContainer
            center={MAP_CENTER}
            zoom={MAP_ZOOM}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              key={active.url}
              url={active.url}
              attribution={active.attribution}
              maxZoom={active.maxZoom ?? 19}
              {...(active.subdomains ? { subdomains: active.subdomains } : {})}
              {...(active.tileSize
                ? { tileSize: active.tileSize, zoomOffset: active.zoomOffset ?? 0 }
                : {})}
            />
            <FitBounds places={places} extraLatLngs={fitExtra} />
            <LocateMeControl labels={m} />
            <LiveBullLayer labels={m} live={live} />
            <Polyline
              positions={ENTRADA_ROUTE}
              pathOptions={{
                color: '#C0392B',
                weight: 2.5,
                opacity: 0.45,
                dashArray: '5 9',
                lineCap: 'round',
                lineJoin: 'round',
              }}
            >
              <Popup>
                <div className="min-w-[10rem] space-y-1 text-sm">
                  <strong className="block text-ink">
                    {m.routeEntradaTitle || m.legendRoute}
                  </strong>
                  <p className="text-xs leading-relaxed text-ink/65">
                    {m.routeEntradaHint}
                  </p>
                </div>
              </Popup>
            </Polyline>
            {LARGADA_RECINTOS.map((zone) => (
              <Polygon
                key={zone.id}
                positions={zone.positions}
                pathOptions={{
                  color: '#C0392B',
                  weight: 2,
                  opacity: 0.9,
                  fillColor: '#C0392B',
                  fillOpacity: 0.22,
                }}
              >
                <Popup>
                  <div className="min-w-[10rem] space-y-1 text-sm">
                    <strong className="block text-ink">
                      {m[zone.nameKey] || m.recintoTitle}
                    </strong>
                    <p className="text-xs leading-relaxed text-ink/65">
                      {m[zone.hintKey] || m.recintoHint}
                    </p>
                  </div>
                </Popup>
              </Polygon>
            ))}
            {places.map((p) => {
              const isParking =
                p.kind === 'estacionamento' ||
                p.kind === 'estacionamentoPublico' ||
                p.kind === 'estacionamentoPrivado'
              const directionsUrl = isParking
                ? mapsDriveToUrl(p.lat, p.lng)
                : mapsWalkToUrl(p.lat, p.lng)
              const directionsLabel = isParking
                ? m.goThereDrive || 'Conduzir até (Google Maps)'
                : m.goThere
              return (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIconForPlace(p)}>
                <Popup>
                  <div className="min-w-[10rem] space-y-2 text-sm">
                    <strong className="block text-ink">
                      {m.places?.[p.nameKey] || p.name}
                    </strong>
                    <div className="flex flex-col gap-1.5">
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          track(isParking ? 'map_drive' : 'map_walk', {
                            place_id: p.id,
                          })
                        }
                        className="inline-flex items-center gap-1 font-semibold text-barrete underline-offset-2 hover:underline"
                      >
                        <Navigation className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {directionsLabel}
                      </a>
                      {p.matchTerms?.length ? (
                        <Link
                          to={`/?local=${encodeURIComponent(p.id)}`}
                          onClick={() => track('map_place_view', { place_id: p.id })}
                          className="inline-flex font-semibold text-tejo underline-offset-2 hover:underline"
                        >
                          {m.seeEvents}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </Popup>
              </Marker>
              )
            })}
          </MapContainer>
        </div>
        <p className="px-4 pt-3 text-center text-xs text-ink/50 sm:px-0">{m.hint}</p>
        <p className="mx-4 mt-2 rounded-xl bg-barrete/5 px-3 py-2.5 text-center text-xs leading-relaxed text-ink/65 ring-1 ring-barrete/10 sm:mx-0">
          {m.portableWcSoon}
        </p>
      </div>

      <Footer />
    </div>
  )
}
