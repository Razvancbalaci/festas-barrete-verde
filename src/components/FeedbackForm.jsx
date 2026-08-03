import { useEffect, useState } from 'react'
import { Loader2, MessageSquarePlus, X } from 'lucide-react'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import HoneypotField from './HoneypotField'
import {
  FORM_COOLDOWN_MS,
  FORM_SUBMIT_KEYS,
  formatCooldownSeconds,
  getCooldownRemainingMs,
  isHoneypotFilled,
  markFormSubmitted,
} from '../lib/formSpamGuard'

const empty = { tipo: 'sugestao', mensagem: '', url_extra: '' }

export default function FeedbackForm({ open, onClose }) {
  const { t } = useLang()
  const f = t.feedback
  const [form, setForm] = useState(empty)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const [cooldownMs, setCooldownMs] = useState(0)

  useEffect(() => {
    if (!open) return
    setForm(empty)
    setDone(false)
    setError(null)
    setCooldownMs(getCooldownRemainingMs(FORM_SUBMIT_KEYS.feedback))
  }, [open])

  useEffect(() => {
    if (!open || cooldownMs <= 0) return
    const id = window.setInterval(() => {
      const left = getCooldownRemainingMs(FORM_SUBMIT_KEYS.feedback)
      setCooldownMs(left)
      if (left <= 0) window.clearInterval(id)
    }, 500)
    return () => window.clearInterval(id)
  }, [open, cooldownMs > 0])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function submit(e) {
    e.preventDefault()
    if (isHoneypotFilled(form.url_extra)) {
      setDone(true)
      return
    }
    const left = getCooldownRemainingMs(FORM_SUBMIT_KEYS.feedback)
    if (left > 0) {
      setCooldownMs(left)
      setError(f.wait.replace('{seconds}', String(formatCooldownSeconds(left))))
      return
    }
    const mensagem = form.mensagem.trim()
    if (mensagem.length < 5) {
      setError(f.required)
      return
    }
    if (mensagem.length > 2000) {
      setError(f.error)
      return
    }
    setSending(true)
    setError(null)
    const { error: err } = await supabase.from('feedback').insert({
      tipo: form.tipo === 'problema' ? 'problema' : 'sugestao',
      mensagem: mensagem.slice(0, 2000),
      contacto: null,
    })
    setSending(false)
    if (err) {
      console.error(err)
      const msg = String(err.message || '')
      setError(
        /rate limit/i.test(msg) ? f.rateLimited : f.error,
      )
      return
    }
    markFormSubmitted(FORM_SUBMIT_KEYS.feedback)
    setCooldownMs(FORM_COOLDOWN_MS)
    setDone(true)
  }

  const coolingDown = cooldownMs > 0
  const waitLabel = coolingDown
    ? f.wait.replace('{seconds}', String(formatCooldownSeconds(cooldownMs)))
    : f.send

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
      onClick={onClose}
    >
      <div
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-creme p-5 shadow-xl animate-fade-up sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="feedback-title"
              className="font-display text-lg font-semibold text-barrete"
            >
              {f.title}
            </h2>
            <p className="mt-1 text-sm text-ink/60">{f.hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink/45 hover:bg-ink/5 hover:text-ink"
            aria-label={f.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="rounded-2xl bg-barrete/10 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-barrete">{f.success}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-xl bg-barrete px-4 py-2 text-sm font-semibold text-white"
            >
              {f.close}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="relative space-y-3">
            <HoneypotField
              id="feedback_url_extra"
              value={form.url_extra}
              onChange={(e) =>
                setForm((s) => ({ ...s, url_extra: e.target.value }))
              }
            />
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink/80">{f.type}</legend>
              <div className="flex gap-2">
                {[
                  { value: 'problema', label: f.problem },
                  { value: 'sugestao', label: f.suggestion },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, tipo: opt.value }))}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      form.tipo === opt.value
                        ? 'bg-barrete text-white'
                        : 'bg-white text-ink/70 ring-1 ring-barrete/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">{f.message}</span>
              <textarea
                value={form.mensagem}
                onChange={(e) =>
                  setForm((s) => ({ ...s, mensagem: e.target.value }))
                }
                className="min-h-[120px] w-full rounded-xl border border-barrete/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-barrete/40"
                maxLength={1000}
                required
              />
            </label>

            {error ? (
              <p className="text-sm font-medium text-vermelho" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={sending || coolingDown}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-dourado px-4 py-3 text-sm font-bold text-ink shadow-sm hover:brightness-105 disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <MessageSquarePlus className="h-4 w-4" />
              )}
              {waitLabel}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
