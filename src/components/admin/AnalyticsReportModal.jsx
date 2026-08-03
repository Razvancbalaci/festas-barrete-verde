import { useMemo, useState } from 'react'
import { FileText, Loader2, X } from 'lucide-react'
import { FESTIVAL_DAYS } from '../../data/days'
import {
  DEFAULT_REPORT_SECTIONS,
  REPORT_SECTIONS,
  buildAnalyticsReportModel,
  clampFestivalDay,
  reportFilterMismatch,
  reportPeriodLabel,
  reportRpcArgs,
} from '../../lib/analyticsReport'
import { downloadAnalyticsReportPdf } from '../../lib/analyticsReportPdf'
import { supabase } from '../../lib/supabase'

export default function AnalyticsReportModal({
  open,
  onClose,
  a,
  t,
  eventLabel,
  defaultDay,
}) {
  const [type, setType] = useState('daily')
  const [dayIso, setDayIso] = useState(() => clampFestivalDay(defaultDay))
  const [sections, setSections] = useState(() => [...DEFAULT_REPORT_SECTIONS])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const periodPreview = useMemo(
    () => reportPeriodLabel(type, dayIso, t, a),
    [type, dayIso, t, a],
  )

  if (!open) return null

  function toggleSection(id) {
    setSections((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function handleGenerate() {
    if (!sections.length) {
      setError(a.reportNeedSection || 'Escolhe pelo menos uma secção.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const args = reportRpcArgs(type, dayIso)
      const { data, error: err } = await supabase.rpc(
        'get_analytics_dashboard',
        args,
      )
      if (err) throw err

      const mismatch = reportFilterMismatch(type, dayIso, data)
      if (mismatch) {
        setError(a.reportSqlRequired || a.dayFilterBlockedBody)
        return
      }

      const model = buildAnalyticsReportModel(data, {
        type,
        dayIso: type === 'daily' ? clampFestivalDay(dayIso) : null,
        sections,
        labels: a,
        t,
        eventLabel,
      })
      downloadAnalyticsReportPdf(model, {
        generatedLabel: (a.reportGeneratedAt || 'Gerado em {when}').replace(
          '{when}',
          model.generatedAt.toLocaleString('pt-PT', {
            timeZone: 'Europe/Lisbon',
          }),
        ),
      })
      onClose()
    } catch (e) {
      console.error(e)
      const detail = [e?.message, e?.details, e?.hint]
        .filter(Boolean)
        .join(' — ')
      setError(
        detail
          ? `${a.reportError || a.errorLoad} (${detail})`
          : a.reportError || a.errorLoad,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analytics-report-title"
      onClick={() => {
        if (!busy) onClose()
      }}
    >
      <div
        className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-creme p-5 shadow-xl animate-fade-up sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="analytics-report-title"
              className="font-display text-lg font-semibold text-barrete"
            >
              {a.reportTitle || 'Gerar relatório'}
            </h2>
            <p className="mt-1 text-xs text-ink/55">
              {a.reportIndependentHint ||
                'O PDF usa só o intervalo abaixo — não o filtro “Período” do painel.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1.5 text-ink/50 hover:bg-ink/5"
            aria-label={t.admin?.cancel || 'Cancelar'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <fieldset className="mb-4">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/45">
            {a.reportType || 'Tipo'}
          </legend>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('daily')}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  type === 'daily'
                    ? 'bg-barrete text-white'
                    : 'bg-white text-ink/70 ring-1 ring-barrete/10'
                }`}
              >
                {a.reportTypeDaily || 'Diário'}
              </button>
              <button
                type="button"
                onClick={() => setType('final')}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  type === 'final'
                    ? 'bg-barrete text-white'
                    : 'bg-white text-ink/70 ring-1 ring-barrete/10'
                }`}
              >
                {a.reportTypeFinal || 'Final da edição'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setType('prelaunch')}
              className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                type === 'prelaunch'
                  ? 'bg-barrete text-white'
                  : 'bg-white text-ink/70 ring-1 ring-barrete/10'
              }`}
            >
              {a.reportTypePrelaunch || 'Pré-lançamento'}
            </button>
          </div>
        </fieldset>

        {type === 'daily' ? (
          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink/45">
              {a.reportDay || 'Dia'}
            </span>
            <select
              value={dayIso}
              onChange={(e) => setDayIso(e.target.value)}
              className="w-full rounded-xl border border-barrete/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-barrete focus:ring-2 focus:ring-barrete/20"
            >
              {FESTIVAL_DAYS.map((d) => (
                <option key={d.date} value={d.date}>
                  {t.weekdaysFull?.[d.weekdayKey] || d.weekdayKey} {d.dayNum}
                  {d.special === 'alcochetano' ? ` — ${t.alcochetano}` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-ink/45">
              {a.reportPeriodPreview || 'Período no PDF'}:{' '}
              <span className="font-semibold text-ink/70">{periodPreview}</span>
            </p>
          </label>
        ) : (
          <p className="mb-4 rounded-xl bg-white px-3 py-2.5 text-sm text-ink/70 ring-1 ring-barrete/5">
            <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-ink/40">
              {a.reportPeriodPreview || 'Período no PDF'}
            </span>
            {periodPreview}
          </p>
        )}

        <fieldset className="mb-4">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/45">
            {a.reportSections || 'Secções'}
          </legend>
          <div className="flex flex-col gap-2">
            {REPORT_SECTIONS.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-barrete/5"
              >
                <input
                  type="checkbox"
                  checked={sections.includes(s.id)}
                  onChange={() => toggleSection(s.id)}
                  className="h-4 w-4 accent-barrete"
                />
                <span className="font-medium text-ink/80">
                  {a[s.labelKey] || s.id}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {error ? (
          <p className="mb-3 rounded-xl bg-vermelho/10 px-3 py-2 text-sm text-vermelho" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-barrete/15 px-4 py-2.5 text-sm font-semibold"
          >
            {t.admin?.cancel || 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy || !sections.length}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-barrete px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {a.reportDownload || 'Descarregar PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
