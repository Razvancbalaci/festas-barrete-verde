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
import {
  makeMapPinIcon,
  pinIconForPlace,
  resolveMapPinStyle,
} from '../lib/mapPinIcon'
import LiveBullLayer, {
  LiveNowBanners,
  useLiveStreetBull,
} from '../components/map/LiveBullLayer'
import LocateMeControl from '../components/map/LocateMeControl'
import Footer from '../components/Footer'
import 'leaflet/dist/leaflet.css'

function placeMatchesLegend(place, legendKey) {
  if (!place || !legendKey) return false
  if (legendKey === 'local') {
    return place.kind === 'local' || place.kind === 'ponto'
  }
  if (legendKey === 'estacionamentoPublico') {
    return (
      place.kind === 'estacionamentoPublico' || place.kind === 'estacionamento'
    )
  }
  return place.kind === legendKey
}

function highlightedPinIcon(place) {
  const hasCustomIcon = Boolean(
    place?.iconSrc || place?.iconKey || place?.iconHtml,
  )
  const style = resolveMapPinStyle(place?.kind, {
    emoji: hasCustomIcon ? undefined : place?.emoji,
    iconSrc: place?.iconSrc,
    iconKey: place?.iconKey,
    iconHtml: place?.iconHtml,
    pinColor: place?.pinColor,
  })
  return makeMapPinIcon({
    ...style,
    size: 40,
    className: 'fbv-map-marker fbv-map-marker-hl',
  })
}

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

function LegendItem({ active, onClick, children, label }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        className={`inline-flex items-center gap-2 rounded-full px-2 py-1 transition ${
          active
            ? 'bg-dourado text-ink shadow-sm ring-1 ring-dourado/50'
            : 'text-white/90 hover:bg-white/15'
        }`}
      >
        {children}
      </button>
    </li>
  )
}

function FitBounds({ places, extraLatLngs = [], enabled }) {
  const map = useMap()
  useEffect(() => {
    if (!enabled) return
    const pts = [
      ...places.map((p) => [p.lat, p.lng]),
      ...extraLatLngs,
    ]
    if (!pts.length) return
    const bounds = L.latLngBounds(pts)
    map.fitBounds(bounds.pad(0.15))
  }, [map, places, extraLatLngs, enabled])
  return null
}

/** Zoom/foco nos elementos da legenda seleccionada. */
function FocusLegendHighlight({ legendKey, places }) {
  const map = useMap()
  useEffect(() => {
    if (!legendKey) return
    let pts = []
    if (legendKey === 'route') {
      pts = ENTRADA_ROUTE.map(([lat, lng]) => [lat, lng])
    } else if (legendKey === 'recinto') {
      pts = LARGADA_RECINTO_LATLNGS.map(([lat, lng]) => [lat, lng])
    } else {
      pts = places
        .filter((p) => placeMatchesLegend(p, legendKey))
        .map((p) => [p.lat, p.lng])
    }
    if (!pts.length) return
    if (pts.length === 1) {
      map.flyTo(pts[0], Math.max(map.getZoom(), 17), { duration: 0.55 })
      return
    }
    map.flyToBounds(L.latLngBounds(pts).pad(0.28), {
      duration: 0.55,
      maxZoom: 17,
    })
  }, [map, legendKey, places])
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
    [],
  )
  const [places, setPlaces] = useState(() => visibleMapPlaces())
  const [legendKey, setLegendKey] = useState(null)

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

  function toggleLegend(key) {
    setLegendKey((prev) => (prev === key ? null : key))
  }

  const legendItems = [
    {
      key: 'palco',
      label: m.legendStage,
      icon: <LegendPin kind="palco" />,
    },
    {
      key: 'local',
      label: m.legendPlace,
      icon: <LegendPin kind="local" />,
    },
    {
      key: 'toiros',
      label: m.legendBulls,
      icon: <LegendPin kind="toiros" />,
    },
    {
      key: 'recinto',
      label: m.legendRecinto,
      icon: <LegendRecinto />,
    },
    {
      key: 'route',
      label: m.legendRoute,
      icon: <LegendRoute />,
    },
    {
      key: 'feira',
      label: m.legendFair,
      icon: <LegendPin kind="feira" />,
    },
    {
      key: 'wc',
      label: m.legendWc,
      icon: <LegendPin kind="wc" />,
    },
    {
      key: 'estacionamentoPublico',
      label: m.legendParkingPublic,
      icon: <LegendPin kind="estacionamentoPublico" />,
    },
  ]
  if (MAP_SHOW_PRIVATE_PARKING) {
    legendItems.push({
      key: 'estacionamentoPrivado',
      label: m.legendParkingPrivate,
      icon: <LegendPin kind="estacionamentoPrivado" />,
    })
  }

  const highlightActive = Boolean(legendKey)
  const routeHighlighted = legendKey === 'route'
  const recintoHighlighted = legendKey === 'recinto'

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
          <p className="mt-2 text-[0.7rem] text-white/65">
            {m.legendTapHint || 'Toca numa legenda para destacar no mapa.'}
          </p>
          <ul className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-xs font-medium">
            {legendItems.map((item) => (
              <LegendItem
                key={item.key}
                active={legendKey === item.key}
                onClick={() => toggleLegend(item.key)}
                label={item.label}
              >
                {item.icon} {item.label}
              </LegendItem>
            ))}
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
            <FitBounds
              places={places}
              extraLatLngs={fitExtra}
              enabled={!highlightActive}
            />
            <FocusLegendHighlight legendKey={legendKey} places={places} />
            <LocateMeControl labels={m} />
            <LiveBullLayer labels={m} live={live} />
            <Polyline
              positions={ENTRADA_ROUTE}
              pathOptions={{
                color: '#C0392B',
                weight: routeHighlighted ? 5 : highlightActive ? 1.5 : 2.5,
                opacity: routeHighlighted
                  ? 0.95
                  : highlightActive
                    ? 0.18
                    : 0.45,
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
                  weight: recintoHighlighted ? 3.5 : highlightActive ? 1 : 2,
                  opacity: recintoHighlighted
                    ? 1
                    : highlightActive
                      ? 0.2
                      : 0.9,
                  fillColor: '#C0392B',
                  fillOpacity: recintoHighlighted
                    ? 0.42
                    : highlightActive
                      ? 0.06
                      : 0.22,
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
              const matched = placeMatchesLegend(p, legendKey)
              const dimmed = highlightActive && !matched
              return (
                <Marker
                  key={p.id}
                  position={[p.lat, p.lng]}
                  icon={matched ? highlightedPinIcon(p) : pinIconForPlace(p)}
                  opacity={dimmed ? 0.28 : 1}
                  zIndexOffset={matched ? 600 : 0}
                >
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
                          <Navigation
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden
                          />
                          {directionsLabel}
                        </a>
                        {p.matchTerms?.length ? (
                          <Link
                            to={`/?local=${encodeURIComponent(p.id)}`}
                            onClick={() =>
                              track('map_place_view', { place_id: p.id })
                            }
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
        <p className="px-4 pt-3 text-center text-xs text-ink/50 sm:px-0">
          {m.hint}
        </p>
        <p className="mx-4 mt-2 rounded-xl bg-barrete/5 px-3 py-2.5 text-center text-xs leading-relaxed text-ink/65 ring-1 ring-barrete/10 sm:mx-0">
          {m.portableWcSoon}
        </p>
      </div>

      <Footer />
    </div>
  )
}
