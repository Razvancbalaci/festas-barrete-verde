import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMap, useMapEvents, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Contrast, MapPin, Store, X } from 'lucide-react'
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
  pinIconForKind,
  pinIconForPlace,
  resolveMapPinStyle,
} from '../lib/mapPinIcon'
import { supabase } from '../lib/supabase'
import {
  BUSINESS_TYPES,
  businessTypeStyle,
  commerceLegendKey,
  commerceTipoFromLegendKey,
  isCommerceLegendKey,
} from '../data/businessTypes'
import LiveBullLayer, {
  LiveNowBanners,
  useLiveStreetBull,
} from '../components/map/LiveBullLayer'
import MapDirectionsCta from '../components/map/MapDirectionsCta'
import LocateMeControl from '../components/map/LocateMeControl'
import Footer from '../components/Footer'
import {
  parseMapComercioParams,
  resolveNegocioFocusLatLng,
} from '../lib/comercioMap'
import {
  dismissMapPinTapTip,
  isMapPinTapTipDismissed,
} from '../lib/mapPinTapTip'
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

function isFestivalPlace(place) {
  return place?.kind !== 'comercio'
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
function LegendPin({ kind, glyph: glyphOverride, border: borderOverride }) {
  const { border, glyph, text, fill, color, radius, fontSize } =
    resolveMapPinStyle(kind, {
      glyph: glyphOverride,
      pinColor: borderOverride,
    })
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
      {typeof glyph === 'string' && glyph.includes('<svg') ? (
        <span
          className="inline-flex items-center justify-center [&>svg]:h-3.5 [&>svg]:w-3.5"
          dangerouslySetInnerHTML={{ __html: glyph }}
        />
      ) : (
        glyph
      )}
    </span>
  )
}

function commercePinOverrides(tipo, { featured = false } = {}) {
  const { glyph, border } = businessTypeStyle(tipo)
  return {
    glyph,
    pinColor: featured ? '#C9A227' : border,
  }
}

function commercePinIcon(tipo, { featured = false } = {}) {
  return makeMapPinIcon({
    ...resolveMapPinStyle('comercio', commercePinOverrides(tipo, { featured })),
    size: featured ? 36 : 32,
  })
}

function highlightedCommercePinIcon(tipo, { featured = false } = {}) {
  return makeMapPinIcon({
    ...resolveMapPinStyle('comercio', commercePinOverrides(tipo, { featured })),
    size: featured ? 44 : 40,
    className: 'fbv-map-marker fbv-map-marker-hl',
  })
}

function commercePinMatchesLegend(tipo, legendKey) {
  if (!legendKey) return false
  if (legendKey === 'comercio') return true
  const legendTipo = commerceTipoFromLegendKey(legendKey)
  if (!legendTipo) return false
  return (tipo || 'Outro') === legendTipo
}

function scrollToCommerceFilters(el) {
  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function scrollToMapLegend(el, offset = 72) {
  if (!el || typeof window === 'undefined') return
  const y = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top: Math.max(0, y), behavior: 'auto' })
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

/** Filtros de comércio por baixo do mapa. */
function CommerceFiltersBar({
  filterLabel,
  filterAllLabel,
  typesT,
  commerceTypeFilter,
  onFilter,
}) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label={filterLabel}
    >
      <button
        type="button"
        onClick={() => onFilter(null)}
        aria-pressed={!commerceTypeFilter}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${
          !commerceTypeFilter
            ? 'bg-barrete text-white ring-barrete/40'
            : 'bg-creme text-ink/70 ring-barrete/10 hover:bg-barrete/5'
        }`}
      >
        {filterAllLabel}
      </button>
      {BUSINESS_TYPES.map((tipo) => {
        const active = commerceTypeFilter === tipo
        const style = businessTypeStyle(tipo)
        return (
          <button
            key={tipo}
            type="button"
            onClick={() => onFilter(active ? null : tipo)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${
              active
                ? 'bg-barrete text-white ring-barrete/40'
                : 'bg-creme text-ink/70 ring-barrete/10 hover:bg-barrete/5'
            }`}
          >
            <span aria-hidden>{style.glyph}</span>
            {typesT?.[tipo] || tipo}
          </button>
        )
      })}
    </div>
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

/** Deep link `/mapa?negocio=` — centra no pin do comércio. */
function FocusNegocio({ negocioId, businesses }) {
  const map = useMap()
  useEffect(() => {
    const target = resolveNegocioFocusLatLng(businesses, negocioId)
    if (!target) return
    map.flyTo(target, Math.max(map.getZoom(), 17), { duration: 0.6 })
  }, [map, negocioId, businesses])
  return null
}

/** Zoom/foco nos elementos da legenda seleccionada. */
function FocusLegendHighlight({ legendKey, places, commercePts = [] }) {
  const map = useMap()
  useEffect(() => {
    if (!legendKey) return
    let pts = []
    if (legendKey === 'route') {
      pts = ENTRADA_ROUTE.map(([lat, lng]) => [lat, lng])
    } else if (legendKey === 'recinto') {
      pts = LARGADA_RECINTO_LATLNGS.map(([lat, lng]) => [lat, lng])
    } else if (isCommerceLegendKey(legendKey)) {
      pts = [
        ...places
          .filter((p) => {
            if (p.kind !== 'comercio') return false
            const tipo = commerceTipoFromLegendKey(legendKey)
            if (!tipo) return true
            return (p.tipo || 'Outro') === tipo
          })
          .map((p) => [p.lat, p.lng]),
        ...commercePts,
      ]
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
  }, [map, legendKey, places, commercePts])
  return null
}

/** Fecha a dica de toque quando o utilizador abre um pin. */
function DismissPinTipOnPopup({ enabled, onDismiss }) {
  useMapEvents({
    popupopen() {
      if (enabled) onDismiss()
    },
  })
  return null
}

export default function FestivalMap() {
  const { t } = useLang()
  const { a11y, toggleA11y } = useA11y()
  const [searchParams] = useSearchParams()
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
  const { showCommerce: paramComercio, negocioId: paramNegocio } =
    parseMapComercioParams(searchParams)
  const [showCommerce, setShowCommerce] = useState(paramComercio)
  const [commerceTypeFilter, setCommerceTypeFilter] = useState(null)
  const [commerceBiz, setCommerceBiz] = useState([])
  const [commerceLoading, setCommerceLoading] = useState(false)
  const [focusNegocioId, setFocusNegocioId] = useState(paramNegocio)
  const [showPinTapTip, setShowPinTapTip] = useState(
    () => !isMapPinTapTipDismissed(),
  )
  const commerceFiltersRef = useRef(null)
  const mapLegendRef = useRef(null)
  const prevShowCommerceRef = useRef(showCommerce)

  function dismissPinTapTip() {
    dismissMapPinTapTip()
    setShowPinTapTip(false)
  }

  useEffect(() => {
    if (!paramComercio) return
    setShowCommerce(true)
    setLegendKey('comercio')
  }, [paramComercio])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (showCommerce) {
        scrollToCommerceFilters(commerceFiltersRef.current)
      } else if (prevShowCommerceRef.current) {
        scrollToMapLegend(mapLegendRef.current)
      }
      prevShowCommerceRef.current = showCommerce
    }, 120)
    return () => window.clearTimeout(timer)
  }, [showCommerce])

  useEffect(() => {
    if (paramNegocio) setFocusNegocioId(paramNegocio)
  }, [paramNegocio])

  const festivalPlaces = useMemo(
    () => places.filter(isFestivalPlace),
    [places],
  )
  const commerceManualPlaces = useMemo(
    () => places.filter((p) => p.kind === 'comercio'),
    [places],
  )
  const filteredCommerceManualPlaces = useMemo(() => {
    if (!commerceTypeFilter) return commerceManualPlaces
    return commerceManualPlaces.filter((p) => p.tipo === commerceTypeFilter)
  }, [commerceManualPlaces, commerceTypeFilter])
  const filteredCommerceBiz = useMemo(() => {
    if (!commerceTypeFilter) return commerceBiz
    return commerceBiz.filter((n) => n.tipo === commerceTypeFilter)
  }, [commerceBiz, commerceTypeFilter])
  const commerceBizPts = useMemo(
    () =>
      filteredCommerceBiz
        .filter((n) => Number.isFinite(Number(n.lat)) && Number.isFinite(Number(n.lng)))
        .map((n) => [Number(n.lat), Number(n.lng)]),
    [filteredCommerceBiz],
  )

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

  useEffect(() => {
    if (!showCommerce) {
      setCommerceBiz([])
      setCommerceLoading(false)
      setCommerceTypeFilter(null)
      return
    }
    let cancelled = false
    setCommerceLoading(true)
    ;(async () => {
      const { data, error } = await supabase
        .from('negocios')
        .select('id, nome, tipo, morada, lat, lng, destaque')
        .eq('aprovado', true)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
      if (cancelled) return
      if (error) {
        console.warn(error)
        setCommerceBiz([])
      } else {
        setCommerceBiz(data || [])
      }
      setCommerceLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [showCommerce])

  function toggleLegend(key) {
    setLegendKey((prev) => {
      const next = prev === key ? null : key
      if (isCommerceLegendKey(next)) {
        setShowCommerce(true)
        // Legenda "Comércio" = todos; comercio:Tipo = filtro
        setCommerceTypeFilter(commerceTipoFromLegendKey(next))
      } else if (next === null && isCommerceLegendKey(prev)) {
        setCommerceTypeFilter(null)
      }
      return next
    })
  }

  function setCommerceFilter(tipo) {
    setCommerceTypeFilter(tipo)
    // Destacar no mapa sem inchá-lo a legenda do header
    setLegendKey(tipo ? commerceLegendKey(tipo) : showCommerce ? 'comercio' : null)
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
  const typesT = t.businesses?.types
  const commerceFilterLabel =
    t.businesses?.filterType || m.commerceFilterType || 'Filtrar por tipo'
  const commerceFilterAllLabel =
    t.businesses?.filterAll || m.commerceFilterAll || 'Todos'

  const commercePinCount =
    (showCommerce ? filteredCommerceManualPlaces.length : 0) +
    (showCommerce ? filteredCommerceBiz.length : 0)
  const commercePinCountAll =
    (showCommerce ? commerceManualPlaces.length : 0) +
    (showCommerce ? commerceBiz.length : 0)
  const showCommerceEmpty =
    showCommerce && !commerceLoading && commercePinCount === 0
  const showCommerceEmptyFilter =
    showCommerceEmpty && commerceTypeFilter && commercePinCountAll > 0

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
          <p className="mt-1 text-sm font-medium text-white/90">{m.subtitle}</p>
          <div ref={mapLegendRef} className="scroll-mt-2">
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
                  {item.icon}{' '}
                  <span className="max-sm:sr-only">{item.label}</span>
                </LegendItem>
              ))}
            </ul>
          </div>
        </div>
      </header>

      <div className="relative z-0 mx-auto w-full max-w-3xl flex-1 px-0 sm:px-6 sm:py-4">
        {showPinTapTip ? (
          <div
            className="mx-3 mb-2 flex items-start gap-2 rounded-xl bg-dourado/20 px-3 py-2.5 text-sm text-ink ring-1 ring-dourado/35 sm:mx-0"
            role="status"
          >
            <MapPin
              className="mt-0.5 h-4 w-4 shrink-0 text-barrete"
              aria-hidden
            />
            <p className="min-w-0 flex-1 text-xs font-semibold leading-snug sm:text-sm">
              {m.pinTapTip ||
                'Toca num pin no mapa para abrir detalhes, eventos e direcções.'}
            </p>
            <button
              type="button"
              onClick={dismissPinTapTip}
              className="shrink-0 rounded-lg p-1 text-ink/45 transition hover:bg-ink/5 hover:text-ink"
              aria-label={m.pinTapTipDismiss || 'Fechar dica'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div
          className={`relative h-[min(70vh,560px)] w-full overflow-hidden sm:shadow-sm sm:ring-1 sm:ring-barrete/10 ${
            showCommerce ? 'sm:rounded-t-2xl' : 'sm:rounded-2xl'
          }`}
        >
          <div className="absolute right-3 top-3 z-[1000] flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCommerce((v) => {
                  const next = !v
                  if (!next) {
                    if (isCommerceLegendKey(legendKey)) {
                      setLegendKey(null)
                      setCommerceTypeFilter(null)
                    }
                  } else {
                    setLegendKey('comercio')
                  }
                  return next
                })
              }}
              aria-pressed={showCommerce}
              title={m.commerceToggleHint}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-md ring-1 backdrop-blur transition ${
                showCommerce
                  ? 'bg-dourado text-ink ring-dourado/40'
                  : 'bg-white/95 text-ink/75 ring-barrete/10 hover:bg-barrete/5'
              }`}
            >
              <Store className="h-3.5 w-3.5" aria-hidden />
              {showCommerce
                ? m.commerceToggleOn || m.commerceToggle || 'Comércio'
                : m.commerceToggle || 'Comércio'}
            </button>
            <div className="flex overflow-hidden rounded-xl bg-white/95 text-xs font-bold shadow-md ring-1 ring-barrete/10 backdrop-blur">
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
          </div>

          <LiveNowBanners labels={m} items={live.liveNow} />

          <MapContainer
            center={MAP_CENTER}
            zoom={MAP_ZOOM}
            className="h-full w-full"
            scrollWheelZoom
            zoomControl={false}
          >
            <ZoomControl position="bottomright" />
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
              places={festivalPlaces}
              extraLatLngs={fitExtra}
              enabled={!highlightActive && !focusNegocioId}
            />
            <FocusNegocio
              negocioId={focusNegocioId}
              businesses={commerceBiz}
            />
            <FocusLegendHighlight
              legendKey={focusNegocioId ? null : legendKey}
              places={
                isCommerceLegendKey(legendKey)
                  ? filteredCommerceManualPlaces
                  : festivalPlaces
              }
              commercePts={showCommerce ? commerceBizPts : []}
            />
            <LocateMeControl labels={m} />
            <DismissPinTipOnPopup
              enabled={showPinTapTip}
              onDismiss={dismissPinTapTip}
            />
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
            {festivalPlaces.map((p) => {
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
                        <MapDirectionsCta
                          href={directionsUrl}
                          label={directionsLabel}
                          variant={isParking ? 'drive' : 'walk'}
                          onClick={() =>
                            track(isParking ? 'map_drive' : 'map_walk', {
                              place_id: p.id,
                            })
                          }
                        />
                        {p.matchTerms?.length ? (
                          <Link
                            to={`/?local=${encodeURIComponent(p.id)}`}
                            onClick={() =>
                              track('map_place_view', { place_id: p.id })
                            }
                            className="inline-flex justify-center py-1 text-xs font-semibold text-tejo underline-offset-2 hover:underline"
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
            {showCommerce
              ? filteredCommerceManualPlaces.map((p) => {
                  const tipo = p.tipo || 'Outro'
                  const matched = commercePinMatchesLegend(tipo, legendKey)
                  const dimmed = highlightActive && !matched
                  return (
                    <Marker
                      key={`com-place-${p.id}`}
                      position={[p.lat, p.lng]}
                      icon={
                        matched
                          ? highlightedCommercePinIcon(tipo)
                          : commercePinIcon(tipo)
                      }
                      opacity={dimmed ? 0.28 : 1}
                      zIndexOffset={matched ? 650 : 100}
                    >
                      <Popup>
                        <div className="min-w-[10rem] space-y-2 text-sm">
                          <strong className="block text-ink">
                            {p.name || m.legendCommerce}
                          </strong>
                          {p.tipo ? (
                            <p className="text-xs text-ink/60">
                              {businessTypeStyle(tipo).glyph}{' '}
                              {typesT?.[tipo] || tipo}
                            </p>
                          ) : null}
                          <MapDirectionsCta
                            href={mapsWalkToUrl(p.lat, p.lng)}
                            label={m.goThere}
                            onClick={() =>
                              track('map_walk', { place_id: p.id })
                            }
                          />
                        </div>
                      </Popup>
                    </Marker>
                  )
                })
              : null}
            {showCommerce
              ? filteredCommerceBiz.map((n) => {
                  const lat = Number(n.lat)
                  const lng = Number(n.lng)
                  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
                  const tipo = n.tipo || 'Outro'
                  const featured = Boolean(n.destaque)
                  const focused = focusNegocioId === n.id
                  const matched =
                    focused || commercePinMatchesLegend(tipo, legendKey)
                  const dimmed =
                    !focused && highlightActive && !matched
                  return (
                    <Marker
                      key={`com-biz-${n.id}`}
                      position={[lat, lng]}
                      icon={
                        matched
                          ? highlightedCommercePinIcon(tipo, { featured })
                          : commercePinIcon(tipo, { featured })
                      }
                      opacity={dimmed ? 0.28 : 1}
                      zIndexOffset={
                        focused ? 900 : matched ? 650 : featured ? 200 : 100
                      }
                      eventHandlers={
                        focused
                          ? {
                              add: (e) => {
                                try {
                                  e.target.openPopup()
                                } catch {
                                  /* ignore */
                                }
                              },
                            }
                          : undefined
                      }
                    >
                      <Popup>
                        <div className="min-w-[10rem] space-y-2 text-sm">
                          <strong className="block text-ink">{n.nome}</strong>
                          {featured ? (
                            <p className="text-xs font-semibold text-ink/70">
                              ⭐ {t.businesses?.featured || 'Destaque'}
                            </p>
                          ) : null}
                          {n.tipo ? (
                            <p className="text-xs text-ink/60">
                              {businessTypeStyle(tipo).glyph}{' '}
                              {typesT?.[tipo] || n.tipo}
                            </p>
                          ) : null}
                          {n.morada ? (
                            <p className="text-xs leading-relaxed text-ink/65">
                              {n.morada}
                            </p>
                          ) : null}
                          <div className="flex flex-col gap-1.5">
                            <MapDirectionsCta
                              href={mapsWalkToUrl(lat, lng)}
                              label={m.goThere}
                            />
                            <Link
                              to="/comercio"
                              className="inline-flex justify-center py-1 text-xs font-semibold text-tejo underline-offset-2 hover:underline"
                            >
                              {m.commerceOpenList || 'Ver comércio'}
                            </Link>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })
              : null}
          </MapContainer>
        </div>
        {showCommerce ? (
          <div
            ref={commerceFiltersRef}
            className="border-y border-barrete/10 bg-white px-3 py-2.5 sm:rounded-b-2xl sm:border sm:border-t-0 sm:border-barrete/10 sm:shadow-sm"
          >
            <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-ink/45">
              {commerceFilterLabel}
            </p>
            <CommerceFiltersBar
              filterLabel={commerceFilterLabel}
              filterAllLabel={commerceFilterAllLabel}
              typesT={typesT}
              commerceTypeFilter={commerceTypeFilter}
              onFilter={setCommerceFilter}
            />
          </div>
        ) : null}
        <p className="px-4 pt-3 text-center text-xs text-ink/50 sm:px-0">
          {m.hint}
        </p>
        {showCommerceEmpty ? (
          <p className="mx-4 mt-2 rounded-xl bg-dourado/15 px-3 py-2 text-center text-xs text-ink/70 ring-1 ring-dourado/30 sm:mx-0">
            {showCommerceEmptyFilter
              ? m.commerceEmptyFilter || m.commerceEmpty
              : m.commerceEmpty}
          </p>
        ) : null}
      </div>

      <Footer />
    </div>
  )
}
