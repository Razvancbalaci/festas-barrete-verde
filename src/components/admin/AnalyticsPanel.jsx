import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function formatDay(iso) {
  if (!iso) return '—'
  const [y, m, d] = String(iso).split('-')
  return `${d}/${m}`
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-barrete/5">
      <p className="text-xs font-medium text-ink/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-barrete">{value}</p>
      {hint ? <p className="mt-1 text-[0.65rem] leading-snug text-ink/45">{hint}</p> : null}
    </div>
  )
}

function BarChart({ rows, labelKey, valueKey, maxBars = 14 }) {
  const data = rows.slice(-maxBars)
  const max = Math.max(1, ...data.map((r) => r[valueKey] || 0))
  if (!data.length) {
    return (
      <p className="rounded-xl bg-creme/50 px-4 py-6 text-center text-sm text-ink/45">
        —
      </p>
    )
  }
  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
      {data.map((row) => {
        const v = row[valueKey] || 0
        const h = Math.max(4, Math.round((v / max) * 100))
        return (
          <div key={row[labelKey]} className="flex min-w-[2rem] flex-1 flex-col items-center gap-1">
            <span className="text-[0.6rem] font-semibold text-ink/55">{v}</span>
            <div
              className="w-full rounded-t-md bg-barrete/80"
              style={{ height: `${h}px` }}
              title={`${row[labelKey]}: ${v}`}
            />
            <span className="text-[0.55rem] text-ink/40">{formatDay(row[labelKey])}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AnalyticsPanel({ t, events = [] }) {
  const a = t.admin.analytics
  const [days, setDays] = useState(14)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const eventTitles = useMemo(() => {
    const map = {}
    for (const ev of events) map[ev.id] = ev.titulo
    return map
  }, [events])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data: dash, error: err } = await supabase.rpc('get_analytics_dashboard', {
      p_days: days,
    })
    if (err) {
      console.error(err)
      setError(a.errorLoad)
      setData(null)
    } else {
      setData(dash)
    }
    setLoading(false)
  }, [days, a.errorLoad])

  useEffect(() => {
    load()
  }, [load])

  const totals = data?.totals || {}
  const visitsByDay = data?.visits_by_day || []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-barrete">{a.title}</h2>
          <p className="mt-0.5 text-sm text-ink/55">{a.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border border-barrete/15 bg-white px-3 py-2 text-sm font-medium text-ink"
          >
            <option value={7}>{a.range7}</option>
            <option value={14}>{a.range14}</option>
            <option value={30}>{a.range30}</option>
          </select>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-barrete/10 px-3 py-2 text-sm font-semibold text-barrete hover:bg-barrete/15 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {a.refresh}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-vermelho/10 px-4 py-3 text-sm text-vermelho">
          {error}
          <p className="mt-2 text-xs text-vermelho/80">{a.errorHint}</p>
        </div>
      ) : null}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-barrete" />
        </div>
      ) : data ? (
        <>
          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink/70">{a.sectionVisits}</h3>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={a.totalViews} value={totals.page_views ?? 0} />
              <StatCard label={a.uniqueSessions} value={totals.unique_sessions ?? 0} />
              <StatCard
                label={a.pwaSessions}
                value={totals.pwa_sessions ?? 0}
                hint={a.pwaSessionsHint}
              />
              <StatCard
                label={a.pwaInstalls}
                value={totals.pwa_installs ?? 0}
                hint={a.pwaInstallsHint}
              />
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-barrete/5">
              <p className="mb-3 text-xs font-medium text-ink/50">{a.viewsByDay}</p>
              <BarChart rows={visitsByDay} labelKey="day" valueKey="views" />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink/70">{a.sectionEngagement}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label={a.favoriteAdds} value={totals.favorite_adds ?? 0} />
              <StatCard label={a.favoriteUsers} value={totals.favorite_users ?? 0} />
              <StatCard label={a.remindersSet} value={totals.reminders_set ?? 0} />
              <StatCard label={a.shares} value={totals.shares ?? 0} />
              <StatCard label={a.ticketClicks} value={totals.ticket_clicks ?? 0} />
              <StatCard label={a.pushEnables} value={totals.push_enables ?? 0} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink/70">{a.sectionInstallPush}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard
                label={a.installAccepts}
                value={totals.install_prompt_accepts ?? 0}
              />
              <StatCard
                label={a.installDismisses}
                value={totals.install_prompt_dismisses ?? 0}
              />
              <StatCard label={a.pushSubscribers} value={data.push_subscribers ?? 0} />
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-barrete/5">
              <h3 className="mb-3 text-sm font-semibold text-ink/70">{a.topFavorites}</h3>
              {(data.top_favorites || []).length === 0 ? (
                <p className="text-sm text-ink/45">{a.empty}</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {(data.top_favorites || []).map((row, i) => (
                    <li
                      key={row.event_id}
                      className="flex items-start justify-between gap-2 text-sm"
                    >
                      <span className="min-w-0 text-ink/75">
                        <span className="mr-1.5 font-semibold text-barrete">{i + 1}.</span>
                        {eventTitles[row.event_id] || row.event_id?.slice(0, 8)}
                      </span>
                      <span className="shrink-0 font-semibold text-barrete">{row.adds}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-barrete/5">
              <h3 className="mb-3 text-sm font-semibold text-ink/70">{a.topRoutes}</h3>
              {(data.routes || []).length === 0 ? (
                <p className="text-sm text-ink/45">{a.empty}</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {(data.routes || []).map((row) => (
                    <li key={row.route} className="flex justify-between gap-2">
                      <span className="font-mono text-ink/70">{row.route}</span>
                      <span className="font-semibold text-barrete">{row.views}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink/70">{a.sectionServer}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={a.remindersActive} value={data.reminders_active ?? 0} />
              <StatCard label={a.feedbackTotal} value={data.feedback_total ?? 0} />
              <StatCard label={a.feedbackUnread} value={data.feedback_unread ?? 0} />
              <StatCard
                label={a.negociosPending}
                value={data.negocios_pending ?? 0}
              />
            </div>
          </section>

          <p className="text-xs leading-relaxed text-ink/40">{a.privacyNote}</p>
        </>
      ) : null}
    </div>
  )
}
