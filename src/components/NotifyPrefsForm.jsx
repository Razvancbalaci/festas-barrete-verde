import { useEffect, useState } from 'react'
import { Bell, Loader2, X } from 'lucide-react'
import { useLang } from '../context/LangContext'
import {
  ensurePushForReminders,
  fetchPushPreferences,
  savePushPreferences,
} from '../lib/reminders'

const PREF_KEYS = [
  { key: 'pref_street', labelKey: 'street', hintKey: 'streetHint' },
  { key: 'pref_corrida', labelKey: 'corrida', hintKey: 'corridaHint' },
  { key: 'pref_sjoao', labelKey: 'sjoao', hintKey: 'sjoaoHint' },
  { key: 'pref_broadcast', labelKey: 'broadcast', hintKey: 'broadcastHint' },
]

export default function NotifyPrefsForm({ open, onClose }) {
  const { t } = useLang()
  const p = t.notifyPrefs
  const [prefs, setPrefs] = useState({
    pref_street: true,
    pref_corrida: true,
    pref_sjoao: true,
    pref_broadcast: true,
  })
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!open) return
    setMessage(null)
    setLoading(true)
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchPushPreferences()
        if (cancelled) return
        setPrefs({
          pref_street: data.pref_street,
          pref_corrida: data.pref_corrida,
          pref_sjoao: data.pref_sjoao,
          pref_broadcast: data.pref_broadcast,
        })
        setSubscribed(Boolean(data.subscribed))
      } catch {
        if (!cancelled) setSubscribed(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function enableNotifications() {
    setEnabling(true)
    setMessage(null)
    const ready = await ensurePushForReminders()
    setEnabling(false)
    if (!ready.ok) {
      if (ready.reason === 'needInstall') setMessage({ type: 'err', text: p.needInstall })
      else if (ready.reason === 'denied') setMessage({ type: 'err', text: p.denied })
      else setMessage({ type: 'err', text: p.enableError })
      return
    }
    setSubscribed(true)
    setMessage({ type: 'ok', text: p.enabled })
  }

  async function save() {
    if (!subscribed) {
      setMessage({ type: 'err', text: p.needEnable })
      return
    }
    setSaving(true)
    setMessage(null)
    const result = await savePushPreferences(prefs)
    setSaving(false)
    if (!result.ok) {
      setMessage({ type: 'err', text: p.saveError })
      return
    }
    onClose()
  }

  function toggle(key) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notify-prefs-title"
      onClick={onClose}
    >
      <div
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-creme p-5 shadow-xl animate-fade-up sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-barrete/10">
              <Bell className="h-5 w-5 text-barrete" aria-hidden />
            </div>
            <div>
              <h2
                id="notify-prefs-title"
                className="font-display text-lg font-semibold text-barrete"
              >
                {p.title}
              </h2>
              <p className="mt-1 text-sm text-ink/60">{p.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink/50 hover:bg-ink/5 hover:text-ink"
            aria-label={p.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-barrete" />
          </div>
        ) : (
          <>
            {!subscribed ? (
              <div className="mb-4 rounded-xl bg-dourado/15 px-4 py-3 text-sm text-ink/80 ring-1 ring-dourado/30">
                <p>{p.needEnable}</p>
                <button
                  type="button"
                  disabled={enabling}
                  onClick={enableNotifications}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-barrete px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  {enabling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {p.enable}
                </button>
              </div>
            ) : null}

            <ul className="flex flex-col gap-2">
              {PREF_KEYS.map(({ key, labelKey, hintKey }) => (
                <li key={key}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white px-3.5 py-3 ring-1 ring-barrete/10">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-barrete"
                      checked={Boolean(prefs[key])}
                      onChange={() => toggle(key)}
                      disabled={!subscribed}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">
                        {p[labelKey]}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink/55">
                        {p[hintKey]}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <p className="mt-3 text-xs leading-relaxed text-ink/45">{p.remindersNote}</p>

            {message ? (
              <p
                className={`mt-3 text-sm font-medium ${
                  message.type === 'ok' ? 'text-barrete' : 'text-vermelho'
                }`}
              >
                {message.text}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-ink/5 px-4 py-2.5 text-sm font-semibold text-ink/70 sm:flex-none"
              >
                {p.close}
              </button>
              <button
                type="button"
                disabled={!subscribed || saving}
                onClick={save}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-dourado px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-50 sm:flex-none"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {p.save}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
