import { useState } from 'react'
import { Loader2, LogIn } from 'lucide-react'

export default function LoginForm({ onLogin, t }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError(t.errorRequired)
      return
    }
    setLoading(true)
    const result = await onLogin(email.trim(), password)
    if (result?.error) setError(t.errorLogin)
    setLoading(false)
  }

  return (
    <div className="mx-auto w-full max-w-sm animate-fade-up">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-barrete text-white shadow-lg shadow-barrete/30">
          <LogIn className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="font-display text-2xl font-bold text-barrete">{t.title}</h1>
        <p className="mt-1 text-sm text-ink/60">{t.subtitle}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-barrete/8"
      >
        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium text-ink/80">{t.email}</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-barrete/15 bg-creme/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-barrete focus:ring-2 focus:ring-barrete/20"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1.5 block text-sm font-medium text-ink/80">{t.password}</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-barrete/15 bg-creme/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-barrete focus:ring-2 focus:ring-barrete/20"
          />
        </label>

        {error && (
          <p className="mb-4 rounded-xl bg-vermelho/10 px-3 py-2 text-sm text-vermelho" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-barrete px-4 py-3 text-sm font-semibold text-white transition hover:bg-barrete-light disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t.login}
        </button>
      </form>
    </div>
  )
}
