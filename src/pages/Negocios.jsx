import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Phone,
  Store,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LangContext'
import { BUSINESS_TYPES } from '../data/businessTypes'
import Footer from '../components/Footer'

function mapsUrl(morada) {
  return `https://maps.google.com/?q=${encodeURIComponent(`${morada} Alcochete`)}`
}

const emptyForm = {
  nome: '',
  tipo: 'Restaurante',
  descricao: '',
  morada: '',
  telefone: '',
  email: '',
  website: '',
  horario: '',
}

export default function Negocios() {
  const { t } = useLang()
  const b = t.businesses
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('negocios')
        .select('*')
        .eq('aprovado', true)
        .order('nome')
      if (!cancelled) {
        if (err) {
          console.error(err)
          setList([])
        } else {
          setList(data || [])
        }
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    const required = ['nome', 'tipo', 'descricao', 'morada', 'telefone', 'email']
    if (required.some((k) => !String(form[k]).trim())) {
      setError(b.required)
      return
    }
    setSubmitting(true)
    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      morada: form.morada.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim(),
      website: form.website.trim() || null,
      horario: form.horario.trim() || null,
      aprovado: false,
    }
    const { error: err } = await supabase.from('negocios').insert(payload)
    setSubmitting(false)
    if (err) {
      console.error(err)
      setError(b.error)
      return
    }
    setSuccess(b.success)
    setForm({ ...emptyForm })
    setShowForm(false)
  }

  const inputClass =
    'w-full rounded-xl border border-barrete/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-barrete focus:ring-2 focus:ring-barrete/20'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-barrete/10 bg-gradient-to-br from-barrete to-barrete-light text-white">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/75 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {b.back}
          </Link>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{b.title}</h1>
              <p className="mt-1 text-sm text-white/80">{b.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm(true)
              setSuccess('')
              setError('')
            }}
            className="mt-6 rounded-xl bg-dourado px-5 py-2.5 text-sm font-bold text-ink shadow-sm hover:brightness-105"
          >
            {b.promote}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        {success && (
          <p className="mb-4 rounded-xl bg-barrete/10 px-4 py-3 text-sm font-medium text-barrete" role="status">
            {success}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-barrete" />
          </div>
        ) : list.length === 0 ? (
          <p className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-ink/50 ring-1 ring-barrete/5">
            {b.empty}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((n) => (
              <li
                key={n.id}
                className="animate-fade-up rounded-2xl bg-white p-4 shadow-sm ring-1 ring-barrete/5"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-semibold text-barrete">{n.nome}</h2>
                  <span className="rounded-full bg-dourado/20 px-2.5 py-0.5 text-[0.7rem] font-semibold text-ink/80">
                    {b.types[n.tipo] || n.tipo}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-ink/75">{n.descricao}</p>
                <div className="mt-3 flex flex-col gap-1.5 text-sm">
                  <a
                    href={mapsUrl(n.morada)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1.5 text-tejo hover:underline"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {n.morada}
                  </a>
                  {n.horario ? (
                    <p className="inline-flex items-center gap-1.5 text-ink/60">
                      <Clock className="h-4 w-4 shrink-0" />
                      {n.horario}
                    </p>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`tel:${n.telefone.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-barrete px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {b.call}
                  </a>
                  {n.website ? (
                    <a
                      href={n.website.startsWith('http') ? n.website : `https://${n.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1.5 text-xs font-semibold text-ink/70"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <ExternalLink className="h-3 w-3" />
                      Web
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Footer />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4">
          <div className="absolute inset-0" onClick={() => setShowForm(false)} aria-hidden />
          <form
            onSubmit={handleSubmit}
            className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-creme p-5 shadow-xl animate-fade-up sm:rounded-2xl sm:p-6"
          >
            <h2 className="font-display text-xl font-bold text-barrete">{b.promoteTitle}</h2>
            <p className="mt-1 mb-4 text-sm text-ink/60">{b.promoteHint}</p>

            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">{b.name} *</span>
              <input className={inputClass} value={form.nome} onChange={(e) => update('nome', e.target.value)} required />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">{b.type} *</span>
              <select className={inputClass} value={form.tipo} onChange={(e) => update('tipo', e.target.value)}>
                {BUSINESS_TYPES.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {b.types[tipo] || tipo}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">{b.description} *</span>
              <textarea
                className={`${inputClass} resize-y`}
                rows={3}
                value={form.descricao}
                onChange={(e) => update('descricao', e.target.value)}
                required
              />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">{b.address} *</span>
              <input className={inputClass} value={form.morada} onChange={(e) => update('morada', e.target.value)} required />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">{b.phone} *</span>
              <input className={inputClass} type="tel" value={form.telefone} onChange={(e) => update('telefone', e.target.value)} required />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">{b.email} *</span>
              <input className={inputClass} type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">{b.website}</span>
              <input className={inputClass} value={form.website} onChange={(e) => update('website', e.target.value)} />
            </label>
            <label className="mb-5 block">
              <span className="mb-1 block text-sm font-medium">{b.hours}</span>
              <input className={inputClass} value={form.horario} onChange={(e) => update('horario', e.target.value)} />
            </label>

            {error && (
              <p className="mb-3 rounded-xl bg-vermelho/10 px-3 py-2 text-sm text-vermelho" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-xl border border-barrete/15 px-4 py-2.5 text-sm font-semibold"
              >
                {t.admin.cancel}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-barrete px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {b.submit}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
