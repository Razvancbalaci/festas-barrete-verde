import { ENTRADA_ROUTE_STREETS } from '../data/mapPlaces'
import {
  displayPlace,
  isEntradaGpsRouteEvent,
  parseLocations,
} from './locations'

/** Resumo legível do local (percurso multi-rua → início → fim). */
export function eventLocalSummary(event) {
  const title = event?.titulo || event?.title || ''
  if (isEntradaGpsRouteEvent({ titulo: title })) {
    const streets = ENTRADA_ROUTE_STREETS
    if (streets.length >= 2) {
      return `${displayPlace(streets[0])} → ${displayPlace(streets[streets.length - 1])}`
    }
    return streets[0] || ''
  }
  const streets = parseLocations(event?.local)
  if (streets.length >= 2) {
    return `${displayPlace(streets[0])} → ${displayPlace(streets[streets.length - 1])}`
  }
  return String(event?.local || '').trim()
}
