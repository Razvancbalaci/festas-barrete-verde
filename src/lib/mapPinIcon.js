import L from 'leaflet'
import {
  mapPinHtml,
  resolveMapPinStyle,
} from './mapPinStyle.js'

export {
  MAP_PIN_FILL,
  MAP_PIN_KINDS,
  mapPinHtml,
  resolveMapPinStyle,
} from './mapPinStyle.js'

/**
 * @param {{ border?: string, glyph?: string, text?: boolean, fill?: string, color?: string, radius?: string, fontSize?: number|null, size?: number, className?: string }} opts
 */
export function makeMapPinIcon({
  border,
  glyph,
  text = false,
  fill,
  color,
  radius,
  fontSize = null,
  size = 32,
  className = 'fbv-map-marker',
} = {}) {
  return L.divIcon({
    className,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
    html: mapPinHtml({ border, glyph, text, fill, color, radius, fontSize, size }),
  })
}

const iconCache = new Map()

function cacheKey(style) {
  return [
    style.border,
    style.glyph,
    style.text ? 1 : 0,
    style.fill,
    style.color,
    style.radius,
    style.fontSize,
    style.iconSrc || '',
    style.iconKey || '',
  ].join('|')
}

/** Icon Leaflet para um `kind` (+ overrides opcionais). */
export function pinIconForKind(kind, overrides = {}) {
  const style = resolveMapPinStyle(kind, overrides)
  const key = cacheKey(style)
  let icon = iconCache.get(key)
  if (!icon) {
    icon = makeMapPinIcon(style)
    iconCache.set(key, icon)
  }
  return icon
}

/** Icon para um lugar de `MAP_PLACES` (respeita `emoji` / `iconSrc` / `pinColor`). */
export function pinIconForPlace(place) {
  const hasCustomIcon = Boolean(
    place?.iconSrc || place?.iconKey || place?.iconHtml,
  )
  return pinIconForKind(place?.kind, {
    emoji: hasCustomIcon ? undefined : place?.emoji,
    iconSrc: place?.iconSrc,
    iconKey: place?.iconKey,
    iconHtml: place?.iconHtml,
    pinColor: place?.pinColor,
  })
}

/** Pin do toiro live (mesmo visual partilhado). */
export function bullPinIcon() {
  return pinIconForKind('bull')
}
