import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { MAP_PLACES } from '../../data/mapPlaces'

function formatDay(iso) {
  if (!iso) return '—'
  const [, m, d] = String(iso).split('-')
  return `${d}/${m}`
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-barrete/5">
      <p className="text-xs font-medium text-ink/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-barrete tabular-nums">
        {value ?? 0}
      </p>
      {hint ? <p className="mt-1 text-[0.65rem] leading-snug text-ink/45">{hint}</p> : null}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl bg-creme/40 p-4 ring-1 ring-barrete/5 sm:p-5">
      <h3 className="mb-3 font-display text-base font-semibold text-barrete">{title}</h3>
      {children}
    </section>
  )
}

function BarChart({ rows, labelKey, valueKey, formatLabel, maxBars = 24 }) {
  const data = rows.slice(-maxBars)
  const max = Math.max(1, ...data.map((r) => r[valueKey] || 0))
  if (!data.length) {
    return (
      <p className="rounded-xl bg-white/70 px-4 py-6 text-center text-sm text-ink/45">—</p>
    )
  }
  return (
    <div className="flex items-end gap-1 overflow-x-auto pb-1">
      {data.map((row) => {
        const v = row[valueKey] || 0
        const h = Math.max(4, Math.round((v / max) * 88))
        const label = formatLabel ? formatLabel(row[labelKey]) : String(row[labelKey])
        return (
          <div
            key={String(row[labelKey])}
            className="flex min-w-[1.65rem] flex-1 flex-col items-center gap-1"
          >
            <span className="text-[0.55rem] font-semibold text-ink/55">{v}</span>
            <div
              className="w-full rounded-t-md bg-barrete/80"
              style={{ height: `${h}px` }}
              title={`${label}: ${v}`}
            />
            <span className="text-[0.5rem] text-ink/40">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

function RankList({ rows, empty, renderLabel, valueKey = 'count' }) {
  if (!rows?.length) {
    return <p className="text-sm text-ink/45">{empty}</p>
  }
  return (
    <ol className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <li key={i} className="flex items-start justify-between gap-2 text-sm">
          <span className="min-w-0 text-ink/75">
            <span className="mr-1.5 font-semibold text-barrete">{i + 1}.</span>
            {renderLabel(row)}
          </span>
          <span className="shrink-0 font-semibold tabular-nums text-barrete">
            {row[valueKey]}
          </span>
        </li>
      ))}
    </ol>
  )
}

function pct(part, whole) {
  if (!whole) return '—'
  return `${Math.round((100 * part) / whole)}%`
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

  const placeNames = useMemo(() => {
    const map = {}
    for (const p of MAP_PLACES) {
      map[p.id] = t.map?.places?.[p.nameKey] || p.name
    }
    return map
  }, [t])

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
  const eventLabel = (id) => eventTitles[id] || (id ? `${String(id).slice(0, 8)}…` : '—')
  const placeLabel = (id) => placeNames[id] || id || '—'

  const hourRows = useMemo(() => {
    const raw = data?.visits_by_hour
    const list = Array.isArray(raw)
      ? raw
      : typeof raw === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(raw)
              return Array.isArray(parsed) ? parsed : []
            } catch {
              return []
            }
          })()
        : []

    const byHour = new Map()
    for (const row of list) {
      const hour = Number(row?.hour)
      const views = Number(row?.views)
      if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue
      byHour.set(hour, (byHour.get(hour) || 0) + (Number.isFinite(views) ? views : 0))
    }

    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      views: byHour.get(hour) || 0,
    }))
  }, [data])

  return (
    <div className="flex flex-col gap-5">
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
          <Section title={a.sectionVisits}>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={a.totalViews} value={totals.page_views} />
              <StatCard label={a.uniqueSessions} value={totals.unique_sessions} />
              <StatCard
                label={a.pwaSessions}
                value={totals.pwa_sessions}
                hint={a.pwaSessionsHint}
              />
              <StatCard label={a.pwaInstalls} value={totals.pwa_installs} hint={a.pwaInstallsHint} />
            </div>
            <div className="mb-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-barrete/5">
              <p className="mb-2 text-xs font-medium text-ink/50">{a.viewsByDay}</p>
              <BarChart
                rows={data.visits_by_day || []}
                labelKey="day"
                valueKey="views"
                formatLabel={formatDay}
                maxBars={days}
              />
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-barrete/5">
              <p className="mb-2 text-xs font-medium text-ink/50">{a.viewsByHour}</p>
              <BarChart
                rows={hourRows}
                labelKey="hour"
                valueKey="views"
                formatLabel={(h) => `${h}h`}
                maxBars={24}
              />
            </div>
            <div className="mt-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-barrete/5">
              <p className="mb-2 text-xs font-medium text-ink/50">{a.topRoutes}</p>
              <RankList
                rows={data.routes || []}
                empty={a.empty}
                valueKey="views"
                renderLabel={(row) => <span className="font-mono">{row.route}</span>}
              />
            </div>
          </Section>

          <Section title={a.sectionProgram}>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={a.filterToday} value={totals.filter_today} />
              <StatCard label={a.filterNow} value={totals.filter_now} />
              <StatCard label={a.filterFavorites} value={totals.filter_favorites} />
              <StatCard label={a.searches} value={totals.searches} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-barrete/5">
                <p className="mb-2 text-xs font-medium text-ink/50">{a.topCategories}</p>
                <RankList
                  rows={data.categories || []}
                  empty={a.empty}
                  renderLabel={(row) =>
                    row.category === 'all'
                      ? a.categoryAll
                      : t.categories?.[row.category] || row.category
                  }
                />
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-barrete/5">
                <p className="mb-2 text-xs font-medium text-ink/50">{a.languages}</p>
                <RankList
                  rows={data.languages || []}
                  empty={a.empty}
                  renderLabel={(row) => String(row.lang).toUpperCase()}
                />
                <p className="mt-3 text-xs text-ink/45">
                  {a.a11yOn}: <strong className="text-barrete">{totals.a11y_on ?? 0}</strong>
                  {' · '}
                  {a.a11yToggles}: {totals.a11y_toggles ?? 0}
                </p>
              </div>
            </div>
          </Section>

          <Section title={a.sectionEngagement}>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label={a.favoriteAdds} value={totals.favorite_adds} />
              <StatCard label={a.favoriteUsers} value={totals.favorite_users} />
              <StatCard label={a.remindersSet} value={totals.reminders_set} />
              <StatCard label={a.shares} value={totals.shares} />
              <StatCard label={a.ticketClicks} value={totals.ticket_clicks} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-barrete/5">
                <p className="mb-2 text-xs font-medium text-ink/50">{a.topFavorites}</p>
                <RankList
                  rows={data.top_favorites || []}
                  empty={a.empty}
                  valueKey="adds"
                  renderLabel={(row) => eventLabel(row.event_id)}
                />
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-barrete/5">
                <p className="mb-2 text-xs font-medium text-ink/50">{a.topReminders}</p>
                <RankList
                  rows={data.top_reminders || []}
                  empty={a.empty}
                  renderLabel={(row) => eventLabel(row.event_id)}
                />
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-barrete/5">
                <p className="mb-2 text-xs font-medium text-ink/50">{a.topShares}</p>
                <RankList
                  rows={data.top_shares || []}
                  empty={a.empty}
                  renderLabel={(row) => eventLabel(row.event_id)}
                />
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-barrete/5">
                <p className="mb-2 text-xs font-medium text-ink/50">{a.topTickets}</p>
                <RankList
                  rows={data.top_tickets || []}
                  empty={a.empty}
                  renderLabel={(row) => eventLabel(row.event_id)}
                />
              </div>
            </div>
          </Section>

          <Section title={a.sectionMap}>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <StatCard label={a.mapWalks} value={totals.map_walks} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-barrete/5">
                <p className="mb-2 text-xs font-medium text-ink/50">{a.topMapPlaces}</p>
                <RankList
                  rows={data.top_map_places || []}
                  empty={a.empty}
                  valueKey="views"
                  renderLabel={(row) => placeLabel(row.place_id)}
                />
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-barrete/5">
                <p className="mb-2 text-xs font-medium text-ink/50">{a.topMapWalks}</p>
                <RankList
                  rows={data.top_map_walks || []}
                  empty={a.empty}
                  renderLabel={(row) => placeLabel(row.place_id)}
                />
              </div>
            </div>
          </Section>

          <Section title={a.sectionInstallPush}>
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label={a.installShows} value={totals.install_prompt_shows} />
              <StatCard label={a.installAccepts} value={totals.install_prompt_accepts} />
              <StatCard label={a.installDismisses} value={totals.install_prompt_dismisses} />
              <StatCard label={a.pushShows} value={totals.push_prompt_shows} />
              <StatCard label={a.pushEnables} value={totals.push_enables} />
              <StatCard label={a.pushSubscribers} value={data.push_subscribers} />
            </div>
            <div className="rounded-xl bg-white p-3 text-sm text-ink/70 shadow-sm ring-1 ring-barrete/5">
              <p className="font-medium text-ink/80">{a.funnelTitle}</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>
                  {a.funnelInstall}:{' '}
                  <strong className="text-barrete">
                    {pct(totals.install_prompt_accepts, totals.install_prompt_shows)}
                  </strong>
                </li>
                <li>
                  {a.funnelPush}:{' '}
                  <strong className="text-barrete">
                    {pct(totals.push_enables, totals.push_prompt_shows)}
                  </strong>
                </li>
              </ul>
            </div>
          </Section>

          <Section title={a.sectionComercio}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label={a.comercioSubmits} value={totals.comercio_submits} />
              <StatCard label={a.negociosPending} value={data.negocios_pending} />
              <StatCard label={a.negociosApproved} value={data.negocios_approved} />
            </div>
          </Section>

          <Section title={a.sectionServer}>
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={a.remindersActive} value={data.reminders_active} />
              <StatCard label={a.feedbackTotal} value={data.feedback_total} />
              <StatCard label={a.feedbackUnread} value={data.feedback_unread} />
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-barrete/5">
              <p className="mb-2 text-xs font-medium text-ink/50">{a.feedbackByType}</p>
              <RankList
                rows={data.feedback_by_type || []}
                empty={a.empty}
                renderLabel={(row) =>
                  row.tipo === 'problema'
                    ? t.feedback?.problem || row.tipo
                    : row.tipo === 'sugestao'
                      ? t.feedback?.suggestion || row.tipo
                      : row.tipo
                }
              />
            </div>
          </Section>

          <p className="text-xs leading-relaxed text-ink/40">{a.privacyNote}</p>
        </>
      ) : null}
    </div>
  )
}
