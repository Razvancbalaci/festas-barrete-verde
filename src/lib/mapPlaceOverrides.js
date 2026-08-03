import { supabase } from './supabase'
import { MAP_PLACES, visibleMapPlaces } from '../data/mapPlaces'

/**
 * @typedef {{
 *   place_id: string,
 *   lat?: number|null,
 *   lng?: number|null,
 *   name?: string|null,
 *   hidden?: boolean|null,
 *   kind?: string|null,
 *   emoji?: string|null,
 *   is_custom?: boolean|null,
 *   updated_at?: string
 * }} MapPlaceOverride
 */

export const MAP_PLACE_KIND_OPTIONS = [
  'local',
  'palco',
  'toiros',
  'feira',
  'wc',
  'estacionamentoPublico',
]

const SELECT_COLS =
  'place_id, lat, lng, name, hidden, kind, emoji, is_custom, updated_at'

function slugifyPlaceId(name) {
  const base = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36)
  return base || 'local'
}

/** Gera id único para pin criado no admin. */
export function newCustomPlaceId(name) {
  const slug = slugifyPlaceId(name)
  const suffix =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : String(Date.now()).slice(-8)
  return `custom-${slug}-${suffix}`
}

function customRowToPlace(o) {
  return {
    id: o.place_id,
    name: (o.name && String(o.name).trim()) || o.place_id,
    lat: Number(o.lat),
    lng: Number(o.lng),
    kind: o.kind || 'local',
    emoji: o.emoji?.trim() || undefined,
    hidden: Boolean(o.hidden),
    _custom: true,
    _overridden: true,
  }
}

/**
 * Aplica overrides (Supabase) sobre a lista estática e acrescenta pins custom.
 */
export function applyMapPlaceOverrides(places = MAP_PLACES, overrides = []) {
  const patches = []
  const customs = []
  for (const o of overrides || []) {
    if (!o?.place_id) continue
    if (o.is_custom) customs.push(o)
    else patches.push(o)
  }

  const byId = new Map(patches.map((o) => [o.place_id, o]))
  const merged = (places || []).map((p) => {
    const o = byId.get(p.id)
    if (!o) return { ...p, _overridden: false, _custom: false }
    const next = { ...p, _overridden: true, _custom: false }
    if (o.lat != null && Number.isFinite(Number(o.lat))) next.lat = Number(o.lat)
    if (o.lng != null && Number.isFinite(Number(o.lng))) next.lng = Number(o.lng)
    if (typeof o.name === 'string' && o.name.trim()) next.name = o.name.trim()
    if (o.hidden != null) next.hidden = Boolean(o.hidden)
    return next
  })

  const existingIds = new Set(merged.map((p) => p.id))
  for (const o of customs) {
    if (existingIds.has(o.place_id)) continue
    if (o.lat == null || o.lng == null) continue
    if (!Number.isFinite(Number(o.lat)) || !Number.isFinite(Number(o.lng))) continue
    merged.push(customRowToPlace(o))
  }
  return merged
}

export async function fetchMapPlaceOverrides() {
  const { data, error } = await supabase.from('map_place_overrides').select(SELECT_COLS)
  if (error) {
    // Tabela ainda não criada → app continua só com o código
    if (/map_place_overrides|schema cache|does not exist/i.test(error.message || '')) {
      return { overrides: [], missingTable: true, error }
    }
    // Colunas novas ainda não existem — tenta select mínimo
    if (/kind|is_custom|emoji|column/i.test(error.message || '')) {
      const fallback = await supabase
        .from('map_place_overrides')
        .select('place_id, lat, lng, name, hidden, updated_at')
      if (fallback.error) {
        return { overrides: [], missingTable: false, error: fallback.error, needsMigration: true }
      }
      return {
        overrides: fallback.data || [],
        missingTable: false,
        error: null,
        needsMigration: true,
      }
    }
    return { overrides: [], missingTable: false, error }
  }
  return { overrides: data || [], missingTable: false, error: null, needsMigration: false }
}

export async function loadVisibleMapPlaces() {
  const { overrides, missingTable, error } = await fetchMapPlaceOverrides()
  const merged = applyMapPlaceOverrides(MAP_PLACES, overrides)
  return {
    places: visibleMapPlaces(merged),
    allPlaces: merged,
    overrides,
    missingTable,
    error,
  }
}

export async function upsertMapPlaceOverride(placeId, patch) {
  const row = {
    place_id: placeId,
    lat: patch.lat == null || patch.lat === '' ? null : Number(patch.lat),
    lng: patch.lng == null || patch.lng === '' ? null : Number(patch.lng),
    name: patch.name?.trim() ? patch.name.trim() : null,
    hidden: patch.hidden == null ? null : Boolean(patch.hidden),
  }
  if (patch.is_custom != null) row.is_custom = Boolean(patch.is_custom)
  if (patch.kind != null) row.kind = String(patch.kind).trim() || null
  if (patch.emoji != null) row.emoji = String(patch.emoji).trim() || null

  if (row.lat != null && !Number.isFinite(row.lat)) {
    return { error: new Error('invalid lat') }
  }
  if (row.lng != null && !Number.isFinite(row.lng)) {
    return { error: new Error('invalid lng') }
  }
  const { data, error } = await supabase
    .from('map_place_overrides')
    .upsert(row, { onConflict: 'place_id' })
    .select()
    .maybeSingle()
  return { data, error }
}

/** Cria um pin novo (só na BD). */
export async function createCustomMapPlace({ name, lat, lng, kind, emoji, hidden }) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return { error: new Error('name required') }
  const placeId = newCustomPlaceId(trimmed)
  return upsertMapPlaceOverride(placeId, {
    name: trimmed,
    lat,
    lng,
    kind: kind || 'local',
    emoji: emoji || null,
    hidden: Boolean(hidden),
    is_custom: true,
  })
}

export async function clearMapPlaceOverride(placeId) {
  const { error } = await supabase
    .from('map_place_overrides')
    .delete()
    .eq('place_id', placeId)
  return { error }
}
