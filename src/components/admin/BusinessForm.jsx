import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { BUSINESS_TYPES } from '../../data/businessTypes'
import { sanitizeHttpUrl } from '../../lib/safeUrl'

/**
 * Formulário admin para editar um negócio (pendente, aprovado ou rejeitado).
 */
export default function BusinessForm({ business, onSave, onCancel, t, typesT }) {
  const [form, setForm] = useState({
    nome: business?.nome || '',
    tipo: business?.tipo || BUSINESS_TYPES[0],
    descricao: business?.descricao || '',
    morada: business?.morada || '',
    telefone: business?.telefone || '',
    email: business?.email || '',
    website: business?.website || '',
    horario: business?.horario || '',
    nota_admin: business?.nota_admin || '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (
      !form.nome.trim() ||
      !form.tipo ||
      !form.descricao.trim() ||
      !form.morada.trim()
    ) {
      setError(t.bizRequired || t.errorRequired)
      return
    }
    const website = form.website.trim()
      ? sanitizeHttpUrl(form.website.trim())
      : null
    if (form.website.trim() && !website) {
      setError(t.errorInvalidUrl)
      return
    }
    setBusy(true)
    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      morada: form.morada.trim(),
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      website,
      horario: form.horario.trim() || null,
      nota_admin: form.nota_admin.trim() || null,
    }
    const { error: err } = await onSave(payload, business.id)
    setBusy(false)
    if (err) {
      setError(t.errorGeneric)
      return
    }
  }

  const inputClass =
    'w-full rounded-xl border border-barrete/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-barrete focus:ring-2 focus:ring-barrete/20'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!busy) onCancel()
      }}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-creme p-5 shadow-xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-barrete">
            {t.bizEditTitle}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg p-1.5 text-ink/50 hover:bg-ink/5"
            aria-label={t.cancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t.bizName}</span>
            <input
              className={inputClass}
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t.bizType}</span>
            <select
              className={inputClass}
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
            >
              {BUSINESS_TYPES.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {typesT?.[tipo] || tipo}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t.bizDescription}</span>
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={form.descricao}
              onChange={(e) =>
                setForm((f) => ({ ...f, descricao: e.target.value }))
              }
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t.bizAddress}</span>
            <input
              className={inputClass}
              value={form.morada}
              onChange={(e) => setForm((f) => ({ ...f, morada: e.target.value }))}
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{t.bizPhone}</span>
              <input
                className={inputClass}
                value={form.telefone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, telefone: e.target.value }))
                }
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{t.bizEmail}</span>
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t.bizWebsite}</span>
            <input
              className={inputClass}
              value={form.website}
              onChange={(e) =>
                setForm((f) => ({ ...f, website: e.target.value }))
              }
              placeholder="https://"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t.bizHours}</span>
            <input
              className={inputClass}
              value={form.horario}
              onChange={(e) =>
                setForm((f) => ({ ...f, horario: e.target.value }))
              }
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t.bizAdminNote}</span>
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={form.nota_admin}
              onChange={(e) =>
                setForm((f) => ({ ...f, nota_admin: e.target.value }))
              }
              placeholder={t.bizAdminNoteHint}
            />
          </label>

          {error ? (
            <p className="text-sm font-medium text-vermelho" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="flex-1 rounded-xl border border-barrete/15 px-4 py-2.5 text-sm font-semibold"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-barrete px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
