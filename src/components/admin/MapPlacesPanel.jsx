import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  MAP_PLACES,
  MAP_SHOW_PRIVATE_PARKING,
  isMapPlaceVisible,
} from '../../data/mapPlaces'
import { mapsDriveToUrl } from '../../lib/locations'
import {
  MAP_PLACE_KIND_OPTIONS,
  applyMapPlaceOverrides,
  clearMapPlaceOverride,
  createCustomMapPlace,
  fetchMapPlaceOverrides,
  upsertMapPlaceOverride,
} from '../../lib/mapPlaceOverrides'

const emptyForm = () => ({
  lat: '',
  lng: '',
  name: '',
  kind: 'local',
  emoji: '',
  hidden: false,
})

export default function MapPlacesPanel({ t, mapT }) {
  const a = t
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [copiedId, setCopiedId] = useState(null)
  const [overrides, setOverrides] = useState([])
  const [missingTable, setMissingTable] = useState(false)
  const [needsMigration, setNeedsMigration] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const {
      overrides: rows,
      missingTable: missing,
      needsMigration: migrate,
      error,
    } = await fetchMapPlaceOverrides()
    setOverrides(rows)
    setMissingTable(Boolean(missing))
    setNeedsMigration(Boolean(migrate))
    if (error && !missing) {
      setMessage({ type: 'err', text: a.errorGeneric })
    }
    setLoading(false)
  }, [a.errorGeneric])

  useEffect(() => {
    load()
  }, [load])

  const merged = useMemo(
    () => applyMapPlaceOverrides(MAP_PLACES, overrides),
    [overrides],
  )

  const kinds = useMemo(() => {
    const set = new Set([
      ...MAP_PLACES.map((p) => p.kind),
      ...merged.map((p) => p.kind),
    ])
    return ['all', ...Array.from(set).sort()]
  }, [merged])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return merged.filter((p) => {
      if (kindFilter !== 'all' && p.kind !== kindFilter) return false
      if (!q) return true
      const label = mapT?.places?.[p.nameKey] || p.name || p.id
      return (
        String(label).toLowerCase().includes(q) ||
        String(p.id).toLowerCase().includes(q) ||
        String(p.kind).toLowerCase().includes(q)
      )
    })
  }, [query, kindFilter, mapT, merged])

  function kindLabel(kind) {
    if (kind === 'palco') return mapT?.legendStage || kind
    if (kind === 'local' || kind === 'ponto') return mapT?.legendPlace || kind
    if (kind === 'toiros') return mapT?.legendBulls || kind
    if (kind === 'feira') return mapT?.legendFair || kind
    if (kind === 'wc') return mapT?.legendWc || kind
    if (kind === 'estacionamentoPublico' || kind === 'estacionamento')
      return mapT?.legendParkingPublic || kind
    if (kind === 'estacionamentoPrivado')
      return mapT?.legendParkingPrivate || kind
    return kind
  }

  async function copyCoords(place) {
    const text = `${place.lat}, ${place.lng}`
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(place.id)
      window.setTimeout(() => setCopiedId(null), 1500)
    } catch {
      /* ignore */
    }
  }

  function startEdit(place) {
    const base = MAP_PLACES.find((p) => p.id === place.id) || place
    setCreating(false)
    setEditing(place)
    setForm({
      lat: String(place.lat ?? base.lat ?? ''),
      lng: String(place.lng ?? base.lng ?? ''),
      name: place._custom
        ? place.name || ''
        : place._overridden && place.name !== base.name
          ? place.name
          : '',
      kind: place.kind || 'local',
      emoji: place.emoji || '',
      hidden: Boolean(place.hidden),
    })
    setMessage(null)
  }

  function startCreate() {
    setEditing(null)
    setCreating(true)
    setForm(emptyForm())
    setMessage(null)
  }

  function closeModal() {
    if (saving) return
    setEditing(null)
    setCreating(false)
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editing && !creating) return
    setSaving(true)

    let error
    if (creating) {
      ;({ error } = await createCustomMapPlace(form))
    } else if (editing._custom) {
      ;({ error } = await upsertMapPlaceOverride(editing.id, {
        ...form,
        is_custom: true,
        name: form.name.trim() || editing.name,
      }))
    } else {
      ;({ error } = await upsertMapPlaceOverride(editing.id, {
        lat: form.lat,
        lng: form.lng,
        name: form.name,
        hidden: form.hidden,
      }))
    }

    setSaving(false)
    if (error) {
      if (/map_place_overrides|schema cache|does not exist/i.test(error.message || '')) {
        setMissingTable(true)
        setMessage({ type: 'err', text: a.mapPlacesSqlRequired })
      } else if (/kind|is_custom|emoji|column/i.test(error.message || '')) {
        setNeedsMigration(true)
        setMessage({
          type: 'err',
          text: a.mapPlacesSqlRequired || 'Corre map-place-overrides.sql no Supabase.',
        })
      } else {
        setMessage({ type: 'err', text: a.errorGeneric })
      }
      return
    }
    setEditing(null)
    setCreating(false)
    setMessage({
      type: 'ok',
      text: creating
        ? a.mapPlacesCreated || 'Local adicionado — já aparece no mapa público.'
        : a.mapPlacesSaved,
    })
    await load()
  }

  async function resetOverride(placeId) {
    if (!window.confirm(a.mapPlacesResetConfirm)) return
    setSaving(true)
    const { error } = await clearMapPlaceOverride(placeId)
    setSaving(false)
    if (error) {
      setMessage({ type: 'err', text: a.errorGeneric })
      return
    }
    if (editing?.id === placeId) setEditing(null)
    setMessage({ type: 'ok', text: a.mapPlacesResetOk })
    await load()
  }

  async function deleteCustom(placeId) {
    if (!window.confirm(a.mapPlacesDeleteConfirm || 'Apagar este local do mapa?')) return
    setSaving(true)
    const { error } = await clearMapPlaceOverride(placeId)
    setSaving(false)
    if (error) {
      setMessage({ type: 'err', text: a.errorGeneric })
      return
    }
    if (editing?.id === placeId) setEditing(null)
    setMessage({ type: 'ok', text: a.mapPlacesDeleted || 'Local apagado.' })
    await load()
  }

  const modalOpen = creating || editing
  const showCustomFields = creating || editing?._custom

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-barrete/5 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-barrete">
              {a.mapPlacesTitle || 'Locais do mapa'}
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              {a.mapPlacesHintEdit ||
                'Podes corrigir coordenadas, nome e visibilidade sem redeploy. Os valores base continuam em mapPlaces.js.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startCreate}
              disabled={missingTable}
              className="inline-flex items-center gap-1.5 rounded-xl bg-barrete px-3 py-2 text-xs font-semibold text-white hover:bg-barrete/90 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              {a.mapPlacesAdd || 'Adicionar local'}
            </button>
            <Link
              to="/mapa"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-barrete/10 px-3 py-2 text-xs font-semibold text-barrete hover:bg-barrete/15"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {a.mapPlacesOpenMap || 'Abrir mapa público'}
            </Link>
          </div>
        </div>
        {!MAP_SHOW_PRIVATE_PARKING ? (
          <p className="mt-3 text-xs text-ink/45">
            {a.mapPlacesPrivateOff ||
              'Estacionamento privado (centros comerciais) está desligado na app.'}
          </p>
        ) : null}
      </section>

      {missingTable || needsMigration ? (
        <div className="rounded-xl bg-dourado/20 px-4 py-3 text-sm text-ink ring-1 ring-dourado/40">
          <p className="font-semibold">
            {missingTable ? a.mapPlacesSqlTitle : a.mapPlacesMigrateTitle || a.mapPlacesSqlTitle}
          </p>
          <p className="mt-1 text-xs text-ink/70">
            {needsMigration && !missingTable
              ? a.mapPlacesMigrateBody || a.mapPlacesSqlBody
              : a.mapPlacesSqlBody}
          </p>
        </div>
      ) : null}

      {message ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            message.type === 'ok'
              ? 'bg-barrete/10 text-barrete'
              : 'bg-vermelho/10 text-vermelho'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-barrete/5">
        <div className="flex flex-wrap gap-1.5">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindFilter(k)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                kindFilter === k
                  ? 'bg-barrete text-white'
                  : 'bg-creme text-ink/65 ring-1 ring-barrete/10'
              }`}
            >
              {k === 'all' ? a.bizFilterAll || 'Tudo' : kindLabel(k)}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={a.mapPlacesSearch || 'Pesquisar local…'}
          className="w-full rounded-xl border border-barrete/15 bg-creme/50 px-3 py-2 text-sm outline-none focus:border-barrete/40"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-barrete" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-ink/45 ring-1 ring-barrete/5">
          {a.mapPlacesEmpty || 'Nenhum local com estes filtros.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((p) => {
            const visible = isMapPlaceVisible(p)
            const label = mapT?.places?.[p.nameKey] || p.name || p.id
            const base = MAP_PLACES.find((x) => x.id === p.id)
            return (
              <li
                key={p.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-barrete/5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <MapPin className="h-4 w-4 text-barrete" aria-hidden />
                  <p className="font-semibold text-ink">{label}</p>
                  <span className="rounded-full bg-barrete/10 px-2 py-0.5 text-[0.65rem] font-semibold text-barrete">
                    {kindLabel(p.kind)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                      visible
                        ? 'bg-tejo/15 text-tejo'
                        : 'bg-ink/10 text-ink/50'
                    }`}
                  >
                    {visible
                      ? a.mapPlacesVisible || 'Visível'
                      : a.mapPlacesHidden || 'Oculto'}
                  </span>
                  {p._custom ? (
                    <span className="rounded-full bg-tejo/15 px-2 py-0.5 text-[0.65rem] font-semibold text-tejo">
                      {a.mapPlacesCustomBadge || 'Admin'}
                    </span>
                  ) : p._overridden ? (
                    <span className="rounded-full bg-dourado/25 px-2 py-0.5 text-[0.65rem] font-semibold text-ink/70">
                      {a.mapPlacesOverrideBadge || 'Override'}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 font-mono text-xs text-ink/55">
                  {p.id} · {p.lat}, {p.lng}
                  {base && (base.lat !== p.lat || base.lng !== p.lng)
                    ? ` (base ${base.lat}, ${base.lng})`
                    : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    disabled={missingTable}
                    className="inline-flex items-center gap-1 rounded-lg bg-barrete/8 px-3 py-2 text-xs font-semibold text-barrete disabled:opacity-40"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {a.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyCoords(p)}
                    className="inline-flex items-center gap-1 rounded-lg bg-barrete/8 px-3 py-2 text-xs font-semibold text-barrete"
                  >
                    {copiedId === p.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedId === p.id
                      ? a.mapPlacesCopied || 'Copiado'
                      : a.mapPlacesCopy || 'Copiar coords'}
                  </button>
                  <a
                    href={mapsDriveToUrl(p.lat, p.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-tejo/10 px-3 py-2 text-xs font-semibold text-tejo"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {a.mapPlacesGoogle || 'Google Maps'}
                  </a>
                  {p._custom ? (
                    <button
                      type="button"
                      onClick={() => deleteCustom(p.id)}
                      disabled={saving}
                      className="inline-flex items-center gap-1 rounded-lg bg-vermelho/10 px-3 py-2 text-xs font-semibold text-vermelho"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {a.delete || 'Apagar'}
                    </button>
                  ) : p._overridden ? (
                    <button
                      type="button"
                      onClick={() => resetOverride(p.id)}
                      disabled={saving}
                      className="inline-flex items-center gap-1 rounded-lg bg-ink/5 px-3 py-2 text-xs font-semibold text-ink/60"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {a.mapPlacesReset || 'Repor código'}
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
        >
          <form
            className="w-full max-w-md rounded-t-3xl bg-creme p-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveEdit}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-barrete">
                {creating
                  ? a.mapPlacesAddTitle || 'Novo local'
                  : a.mapPlacesEditTitle || 'Editar pin'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-1.5 text-ink/50 hover:bg-ink/5"
                aria-label={a.cancel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {!creating ? (
              <p className="mb-3 text-sm text-ink/60">
                {mapT?.places?.[editing.nameKey] || editing.name} · {editing.id}
              </p>
            ) : null}
            <div className="space-y-3">
              {showCustomFields ? (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium">
                    {a.mapPlacesName || 'Nome'}
                  </span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-xl border border-barrete/15 bg-white px-3 py-2.5 text-sm"
                  />
                </label>
              ) : null}
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{a.mapPlacesLat || 'Latitude'}</span>
                <input
                  required
                  inputMode="decimal"
                  value={form.lat}
                  onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                  className="w-full rounded-xl border border-barrete/15 bg-white px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">{a.mapPlacesLng || 'Longitude'}</span>
                <input
                  required
                  inputMode="decimal"
                  value={form.lng}
                  onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                  className="w-full rounded-xl border border-barrete/15 bg-white px-3 py-2.5 text-sm"
                />
              </label>
              {showCustomFields ? (
                <>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium">
                      {a.mapPlacesKind || 'Tipo'}
                    </span>
                    <select
                      value={form.kind}
                      onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
                      className="w-full rounded-xl border border-barrete/15 bg-white px-3 py-2.5 text-sm"
                    >
                      {MAP_PLACE_KIND_OPTIONS.map((k) => (
                        <option key={k} value={k}>
                          {kindLabel(k)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium">
                      {a.mapPlacesEmoji || 'Emoji (opcional)'}
                    </span>
                    <input
                      value={form.emoji}
                      onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                      placeholder="📍"
                      maxLength={8}
                      className="w-full rounded-xl border border-barrete/15 bg-white px-3 py-2.5 text-sm"
                    />
                  </label>
                </>
              ) : (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium">
                    {a.mapPlacesNameOverride || 'Nome (opcional)'}
                  </span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={editing?.name}
                    className="w-full rounded-xl border border-barrete/15 bg-white px-3 py-2.5 text-sm"
                  />
                </label>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.hidden}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hidden: e.target.checked }))
                  }
                />
                {a.mapPlacesHide || 'Ocultar no mapa público'}
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={closeModal}
                className="flex-1 rounded-xl border border-barrete/15 px-4 py-2.5 text-sm font-semibold"
              >
                {a.cancel}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-barrete px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {creating ? a.mapPlacesCreate || a.save : a.save}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
