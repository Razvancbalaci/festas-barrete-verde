/**
 * Cache local (localStorage) para programa e comércio —
 * útil com rede fraca / offline após uma visita com sucesso.
 */

const PREFIX = 'fbv-cache:v1:'
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

function storageKey(key) {
  return `${PREFIX}${key}`
}

export function readCache(key) {
  try {
    const raw = localStorage.getItem(storageKey(key))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (!Number.isFinite(parsed.savedAt)) return null
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null
    return parsed
  } catch {
    return null
  }
}

export function writeCache(key, data) {
  try {
    localStorage.setItem(
      storageKey(key),
      JSON.stringify({ savedAt: Date.now(), data }),
    )
  } catch {
    /* quota / private mode */
  }
}

const EVENTOS_BY_DAY = 'eventos:byDay'
const EVENTOS_FESTIVAL = 'eventos:festival'
const NEGOCIOS_APPROVED = 'negocios:approved'

export function cacheEventsForDay(dia, events) {
  if (!dia) return
  const bag = { ...(readCache(EVENTOS_BY_DAY)?.data || {}) }
  bag[dia] = Array.isArray(events) ? events : []
  writeCache(EVENTOS_BY_DAY, bag)
}

export function getCachedEventsForDay(dia) {
  if (!dia) return null
  const bag = readCache(EVENTOS_BY_DAY)?.data
  if (!bag || !Object.prototype.hasOwnProperty.call(bag, dia)) return null
  return Array.isArray(bag[dia]) ? bag[dia] : null
}

/** Guarda lista multi-dia (filtro por local) e actualiza o cache por dia. */
export function cacheFestivalEvents(events) {
  const list = Array.isArray(events) ? events : []
  writeCache(EVENTOS_FESTIVAL, list)
  const bag = { ...(readCache(EVENTOS_BY_DAY)?.data || {}) }
  const days = new Set()
  for (const e of list) {
    if (e?.dia) days.add(e.dia)
  }
  for (const dia of days) {
    bag[dia] = list.filter((e) => e.dia === dia)
  }
  writeCache(EVENTOS_BY_DAY, bag)
}

export function getCachedFestivalEvents() {
  const data = readCache(EVENTOS_FESTIVAL)?.data
  return Array.isArray(data) ? data : null
}

export function getCachedEventsByIds(ids) {
  if (!ids?.length) return []
  const want = new Set(ids.map(String))
  const festival = getCachedFestivalEvents()
  if (festival?.length) {
    return festival.filter((e) => want.has(String(e.id)))
  }
  const bag = readCache(EVENTOS_BY_DAY)?.data || {}
  const out = []
  for (const dayEvents of Object.values(bag)) {
    if (!Array.isArray(dayEvents)) continue
    for (const e of dayEvents) {
      if (want.has(String(e.id))) out.push(e)
    }
  }
  return out
}

export function cacheApprovedBusinesses(rows) {
  writeCache(NEGOCIOS_APPROVED, Array.isArray(rows) ? rows : [])
}

export function getCachedApprovedBusinesses() {
  const data = readCache(NEGOCIOS_APPROVED)?.data
  return Array.isArray(data) ? data : null
}
