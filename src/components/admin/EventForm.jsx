import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { CATEGORIES } from '../../data/categories'
import { FESTIVAL_DAYS } from '../../data/days'

const emptyForm = {
  dia: '2026-08-07',
  hora: '',
  titulo: '',
  subtitulo: '',
  local: '',
  categoria: 'Institucional',
  ordem: 0,
  descricao: '',
  bilhetes_url: '',
}

export default function EventForm({ event, onSave, onCancel, t, uiT }) {
  const [form, setForm] = useState(
    event
      ? {
          dia: event.dia,
          hora: event.hora,
          titulo: event.titulo,
          subtitulo: event.subtitulo || '',
          local: event.local || '',
          categoria: event.categoria,
          ordem: event.ordem ?? 0,
          descricao: event.descricao || '',
          bilhetes_url: event.bilhetes_url || '',
        }
      : { ...emptyForm }
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.dia || !form.hora.trim() || !form.titulo.trim() || !form.categoria) {
      setError(t.errorRequired)
      return
    }
    setLoading(true)
    const payload = {
      dia: form.dia,
      hora: form.hora.trim(),
      titulo: form.titulo.trim(),
      subtitulo: form.subtitulo.trim() || null,
      local: form.local.trim() || null,
      categoria: form.categoria,
      ordem: Number(form.ordem) || 0,
      descricao: form.descricao.trim() || null,
      bilhetes_url: form.bilhetes_url.trim() || null,
    }
    const result = await onSave(payload, event?.id)
    if (result?.error) setError(t.errorGeneric)
    setLoading(false)
  }

  const inputClass =
    'w-full rounded-xl border border-barrete/15 bg-creme/40 px-3 py-2.5 text-sm outline-none focus:border-barrete focus:ring-2 focus:ring-barrete/20'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onCancel} aria-hidden />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl animate-fade-up sm:rounded-2xl sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-barrete">
            {event ? t.editEvent : t.addEvent}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1.5 text-ink/40 hover:bg-creme hover:text-ink"
            aria-label={t.cancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium">{t.day}</span>
          <select
            value={form.dia}
            onChange={(e) => update('dia', e.target.value)}
            className={inputClass}
          >
            {FESTIVAL_DAYS.map((d) => (
              <option key={d.date} value={d.date}>
                {uiT.weekdaysFull[d.weekdayKey]} {d.dayNum}
                {d.special === 'alcochetano' ? ` — ${uiT.alcochetano}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium">{t.time}</span>
          <input
            type="text"
            placeholder="22:30"
            value={form.hora}
            onChange={(e) => update('hora', e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium">{t.eventTitle}</span>
          <input
            type="text"
            value={form.titulo}
            onChange={(e) => update('titulo', e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium">{t.subtitle}</span>
          <input
            type="text"
            value={form.subtitulo}
            onChange={(e) => update('subtitulo', e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium">{t.place}</span>
          <input
            type="text"
            value={form.local}
            onChange={(e) => update('local', e.target.value)}
            className={inputClass}
            placeholder="Rua A, Rua B e Av. C"
          />
          {t.placeHint ? (
            <span className="mt-1 block text-xs text-ink/45">{t.placeHint}</span>
          ) : null}
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium">{t.category}</span>
          <select
            value={form.categoria}
            onChange={(e) => update('categoria', e.target.value)}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {uiT.categories[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium">{t.order}</span>
          <input
            type="number"
            min={0}
            value={form.ordem}
            onChange={(e) => update('ordem', e.target.value)}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-ink/45">{t.orderHint}</span>
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium">{t.description}</span>
          <textarea
            rows={8}
            value={form.descricao}
            onChange={(e) => update('descricao', e.target.value)}
            className={`${inputClass} resize-y font-mono text-xs leading-relaxed`}
            placeholder={'CAVALEIROS\nNome\n\nFORCADOS\nGrupo — Cap. Nome'}
          />
          <span className="mt-1 block text-xs text-ink/45">{t.descriptionHint}</span>
        </label>

        <label className="mb-5 block">
          <span className="mb-1 block text-sm font-medium">{t.ticketsUrl}</span>
          <input
            type="url"
            placeholder="https://..."
            value={form.bilhetes_url}
            onChange={(e) => update('bilhetes_url', e.target.value)}
            className={inputClass}
          />
        </label>

        {error && (
          <p className="mb-4 rounded-xl bg-vermelho/10 px-3 py-2 text-sm text-vermelho" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-barrete/15 px-4 py-2.5 text-sm font-semibold text-ink/70 hover:bg-creme"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-barrete px-4 py-2.5 text-sm font-semibold text-white hover:bg-barrete-light disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t.save}
          </button>
        </div>
      </form>
    </div>
  )
}
