import { useEffect, useState } from 'react'
import { FlaskConical, Loader2 } from 'lucide-react'
import {
  fetchAppConfig,
  updateLiveSmokeTestEnabled,
} from '../../lib/appConfig'

export default function DevToolsPanel({ t }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [missingTable, setMissingTable] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetchAppConfig()
      if (cancelled) return
      setEnabled(Boolean(res.liveSmokeTestEnabled))
      setMissingTable(Boolean(res.missingTable))
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function toggle() {
    setSaving(true)
    setMessage(null)
    try {
      const next = !enabled
      await updateLiveSmokeTestEnabled(next)
      setEnabled(next)
      setMessage(next ? t.devToolsLiveOn : t.devToolsLiveOff)
    } catch (err) {
      console.warn(err)
      setMessage(t.devToolsLiveError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-barrete/5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vermelho/10 text-vermelho">
          <FlaskConical className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-ink">{t.devToolsTitle}</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink/65">
            {t.devToolsHint}
          </p>
          {missingTable ? (
            <p className="mt-2 rounded-lg bg-dourado/15 px-3 py-2 text-xs text-ink/75 ring-1 ring-dourado/30">
              {t.devToolsSqlMissing}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              disabled={loading || saving || missingTable}
              aria-pressed={enabled}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition disabled:opacity-50 ${
                enabled
                  ? 'bg-vermelho text-white ring-1 ring-vermelho/40'
                  : 'bg-creme text-ink/75 ring-1 ring-barrete/10 hover:bg-barrete/5'
              }`}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              )}
              {enabled ? t.devToolsLiveEnabled : t.devToolsLiveDisabled}
            </button>
          </div>
          {message ? (
            <p className="mt-2 text-xs font-medium text-barrete">{message}</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
