import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Loader2, LogOut, Pencil, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LangContext'
import { FESTIVAL_DAYS } from '../data/days'
import { CATEGORY_COLORS } from '../data/categories'
import LoginForm from '../components/admin/LoginForm'
import EventForm from '../components/admin/EventForm'

function timeSortKey(hora) {
  const match = String(hora).match(/(\d{1,2}):(\d{2})/)
  if (!match) return 0
  let h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  if (h >= 0 && h < 6) h += 24
  return h * 60 + m
}

export default function Admin() {
  const { t } = useLang()
  const a = t.admin
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [tab, setTab] = useState('events')
  const [events, setEvents] = useState([])
  const [negocios, setNegocios] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [subCount, setSubCount] = useState(null)
  const [notifyForm, setNotifyForm] = useState({ title: '', body: '', scheduledFor: '' })
  const [notifySending, setNotifySending] = useState(false)
  const [schedules, setSchedules] = useState([])
  const [feedbackList, setFeedbackList] = useState([])
  const unreadFeedback = useMemo(
    () => feedbackList.filter((item) => !item.lido).length,
    [feedbackList]
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('eventos').select('*')
    if (error) {
      console.error(error)
      setEvents([])
    } else {
      setEvents(data || [])
    }
    setLoading(false)
  }, [])

  const fetchNegocios = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('negocios')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error(error)
      setNegocios([])
    } else {
      setNegocios(data || [])
    }
    setLoading(false)
  }, [])

  const fetchSubCount = useCallback(async () => {
    const { count, error } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
    if (error) {
      console.error(error)
      setSubCount(null)
    } else {
      setSubCount(count ?? 0)
    }
  }, [])

  const fetchFeedback = useCallback(async (withLoading = true) => {
    if (withLoading) setLoading(true)
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error(error)
      setFeedbackList([])
    } else {
      setFeedbackList(data || [])
    }
    if (withLoading) setLoading(false)
  }, [])

  const fetchSchedules = useCallback(async () => {
    const { data, error } = await supabase
      .from('push_schedules')
      .select('*')
      .order('scheduled_for', { ascending: true })
    if (error) {
      console.error(error)
      setSchedules([])
    } else {
      setSchedules(data || [])
    }
  }, [])

  const processDueSchedules = useCallback(async () => {
    try {
      await supabase.functions.invoke('send-push', {
        body: { processSchedules: true },
      })
      await fetchSchedules()
      await fetchSubCount()
    } catch (err) {
      console.error(err)
    }
  }, [fetchSchedules, fetchSubCount])

  useEffect(() => {
    if (!session) return
    if (tab === 'events') fetchEvents()
    else if (tab === 'businesses') fetchNegocios()
    else if (tab === 'notify') {
      fetchSubCount()
      fetchSchedules()
      processDueSchedules()
    } else if (tab === 'feedback') fetchFeedback(true)
  }, [
    session,
    tab,
    fetchEvents,
    fetchNegocios,
    fetchSubCount,
    fetchSchedules,
    processDueSchedules,
    fetchFeedback,
  ])

  // Contagem de feedback não lido (badge), mesmo noutro separador
  useEffect(() => {
    if (!session) return
    fetchFeedback(false)
  }, [session, fetchFeedback])

  async function markFeedbackRead(id) {
    const { error } = await supabase
      .from('feedback')
      .update({ lido: true })
      .eq('id', id)
    if (error) {
      setMessage({ type: 'err', text: a.errorGeneric })
    } else {
      await fetchFeedback(false)
    }
  }

  async function deleteFeedback(id) {
    if (!window.confirm(a.confirmDelete)) return
    const { error } = await supabase.from('feedback').delete().eq('id', id)
    if (error) {
      setMessage({ type: 'err', text: a.errorGeneric })
    } else {
      await fetchFeedback(tab === 'feedback')
    }
  }

  const grouped = useMemo(() => {
    const map = {}
    for (const day of FESTIVAL_DAYS) map[day.date] = []
    for (const ev of events) {
      if (!map[ev.dia]) map[ev.dia] = []
      map[ev.dia].push(ev)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const d = timeSortKey(a.hora) - timeSortKey(b.hora)
        if (d !== 0) return d
        return (a.ordem ?? 0) - (b.ordem ?? 0)
      })
    }
    return map
  }, [events])

  const pending = useMemo(() => negocios.filter((n) => !n.aprovado), [negocios])
  const approved = useMemo(() => negocios.filter((n) => n.aprovado), [negocios])

  async function handleLogin(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function handleSave(payload, id) {
    let error
    if (id) {
      ;({ error } = await supabase.from('eventos').update(payload).eq('id', id))
    } else {
      ;({ error } = await supabase.from('eventos').insert(payload))
    }
    if (!error) {
      setFormOpen(false)
      setEditing(null)
      setMessage({ type: 'ok', text: a.successSave })
      await fetchEvents()
    }
    return { error }
  }

  async function handleDelete(id) {
    if (!window.confirm(a.confirmDelete)) return
    const { error } = await supabase.from('eventos').delete().eq('id', id)
    if (error) {
      setMessage({ type: 'err', text: a.errorGeneric })
    } else {
      setMessage({ type: 'ok', text: a.successDelete })
      await fetchEvents()
    }
  }

  async function approveBusiness(id) {
    const { error } = await supabase
      .from('negocios')
      .update({ aprovado: true, aprovado_em: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      setMessage({ type: 'err', text: a.errorGeneric })
    } else {
      setMessage({ type: 'ok', text: a.successApprove })
      await fetchNegocios()
    }
  }

  async function rejectBusiness(id) {
    if (!window.confirm(a.confirmReject)) return
    const { error } = await supabase.from('negocios').delete().eq('id', id)
    if (error) {
      setMessage({ type: 'err', text: a.errorGeneric })
    } else {
      setMessage({ type: 'ok', text: a.successReject })
      await fetchNegocios()
    }
  }

  async function handleSendNotify(e) {
    e.preventDefault()
    if (!notifyForm.title.trim() || !notifyForm.body.trim()) {
      setMessage({ type: 'err', text: a.errorRequired })
      return
    }
    setNotifySending(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          title: notifyForm.title.trim(),
          body: notifyForm.body.trim(),
          url: '/',
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setMessage({
        type: 'ok',
        text: `${a.notifySuccess} (${data?.sent ?? 0}/${data?.total ?? 0})`,
      })
      setNotifyForm({ title: '', body: '', scheduledFor: '' })
      await fetchSubCount()
    } catch (err) {
      console.error(err)
      setMessage({ type: 'err', text: a.notifyError })
    } finally {
      setNotifySending(false)
    }
  }

  async function handleScheduleNotify(e) {
    e.preventDefault()
    if (
      !notifyForm.title.trim() ||
      !notifyForm.body.trim() ||
      !notifyForm.scheduledFor
    ) {
      setMessage({ type: 'err', text: a.errorRequired })
      return
    }
    const when = new Date(notifyForm.scheduledFor)
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      setMessage({ type: 'err', text: a.errorRequired })
      return
    }
    setNotifySending(true)
    try {
      const { error } = await supabase.from('push_schedules').insert({
        title: notifyForm.title.trim(),
        body: notifyForm.body.trim(),
        scheduled_for: when.toISOString(),
        status: 'pending',
      })
      if (error) throw error
      setMessage({ type: 'ok', text: a.notifyScheduled })
      setNotifyForm({ title: '', body: '', scheduledFor: '' })
      await fetchSchedules()
    } catch (err) {
      console.error(err)
      setMessage({ type: 'err', text: a.errorGeneric })
    } finally {
      setNotifySending(false)
    }
  }

  async function cancelSchedule(id) {
    const { error } = await supabase
      .from('push_schedules')
      .update({ status: 'cancelled' })
      .eq('id', id)
    if (error) {
      setMessage({ type: 'err', text: a.errorGeneric })
    } else {
      await fetchSchedules()
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-barrete" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <LoginForm onLogin={handleLogin} t={a} />
        <Link
          to="/"
          className="mt-6 text-sm font-medium text-barrete/70 underline-offset-2 hover:underline"
        >
          {a.backToProgram}
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-barrete/10 bg-barrete text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <h1 className="font-display text-xl font-bold">{a.title}</h1>
            <p className="text-sm text-white/70">{a.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium sm:inline"
            >
              {a.backToProgram}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
            >
              <LogOut className="h-3.5 w-3.5" />
              {a.logout}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {message && (
          <div
            className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
              message.type === 'ok'
                ? 'bg-barrete/10 text-barrete'
                : 'bg-vermelho/10 text-vermelho'
            }`}
            role="status"
          >
            {message.text}
            <button
              type="button"
              className="ml-2 underline opacity-70"
              onClick={() => setMessage(null)}
            >
              OK
            </button>
          </div>
        )}

        <div className="mb-5 flex flex-wrap gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-barrete/5 sm:gap-2">
          <button
            type="button"
            onClick={() => setTab('events')}
            className={`min-w-[4.5rem] flex-1 rounded-xl px-2 py-2.5 text-xs font-semibold transition sm:px-3 sm:text-sm ${
              tab === 'events' ? 'bg-barrete text-white' : 'text-ink/60 hover:bg-creme'
            }`}
          >
            {a.tabEvents}
          </button>
          <button
            type="button"
            onClick={() => setTab('businesses')}
            className={`min-w-[4.5rem] flex-1 rounded-xl px-2 py-2.5 text-xs font-semibold transition sm:px-3 sm:text-sm ${
              tab === 'businesses' ? 'bg-barrete text-white' : 'text-ink/60 hover:bg-creme'
            }`}
          >
            {a.tabBusinesses}
            {pending.length > 0 ? (
              <span className="ml-1 rounded-full bg-vermelho px-1.5 py-0.5 text-[0.65rem] text-white sm:ml-1.5">
                {pending.length}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setTab('feedback')}
            className={`min-w-[4.5rem] flex-1 rounded-xl px-2 py-2.5 text-xs font-semibold transition sm:px-3 sm:text-sm ${
              tab === 'feedback' ? 'bg-barrete text-white' : 'text-ink/60 hover:bg-creme'
            }`}
          >
            {a.tabFeedback}
            {unreadFeedback > 0 ? (
              <span className="ml-1 rounded-full bg-vermelho px-1.5 py-0.5 text-[0.65rem] text-white sm:ml-1.5">
                {unreadFeedback}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setTab('notify')}
            className={`min-w-[4.5rem] flex-1 rounded-xl px-2 py-2.5 text-xs font-semibold transition sm:px-3 sm:text-sm ${
              tab === 'notify' ? 'bg-barrete text-white' : 'text-ink/60 hover:bg-creme'
            }`}
          >
            {a.tabNotify}
          </button>
        </div>

        {tab === 'events' ? (
          <>
            <div className="mb-6 flex items-center justify-between gap-3">
              <Link to="/" className="text-sm text-barrete/70 underline sm:hidden">
                {a.backToProgram}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
                className="ml-auto inline-flex items-center gap-2 rounded-xl bg-dourado px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:brightness-105"
              >
                <Plus className="h-4 w-4" />
                {a.addEvent}
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-barrete" />
              </div>
            ) : events.length === 0 ? (
              <p className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-ink/50 ring-1 ring-barrete/5">
                {a.empty}
              </p>
            ) : (
              <div className="flex flex-col gap-8">
                {FESTIVAL_DAYS.map((day) => {
                  const list = grouped[day.date] || []
                  if (!list.length) return null
                  return (
                    <section key={day.date}>
                      <h2 className="mb-3 font-display text-lg font-semibold text-barrete">
                        {t.weekdaysFull[day.weekdayKey]} {day.dayNum}
                        {day.special === 'alcochetano' ? (
                          <span className="ml-2 text-sm font-sans font-medium text-vermelho">
                            · {t.alcochetano}
                          </span>
                        ) : null}
                      </h2>
                      <ul className="flex flex-col gap-2">
                        {list.map((ev) => {
                          const colors =
                            CATEGORY_COLORS[ev.categoria] || CATEGORY_COLORS.Institucional
                          return (
                            <li
                              key={ev.id}
                              className="flex flex-col gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-barrete/5 sm:flex-row sm:items-center"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-display font-bold text-barrete">
                                    {ev.hora}
                                  </span>
                                  <span
                                    className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold"
                                    style={{
                                      backgroundColor: colors.bg,
                                      color: colors.text,
                                    }}
                                  >
                                    {t.categories[ev.categoria] || ev.categoria}
                                  </span>
                                </div>
                                <p className="mt-0.5 font-medium leading-snug">{ev.titulo}</p>
                                {ev.local ? (
                                  <p className="mt-0.5 text-xs text-ink/50">{ev.local}</p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditing(ev)
                                    setFormOpen(true)
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg bg-barrete/8 px-3 py-2 text-xs font-semibold text-barrete hover:bg-barrete/15"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  {a.edit}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(ev.id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-vermelho/8 px-3 py-2 text-xs font-semibold text-vermelho hover:bg-vermelho/15"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {a.delete}
                                </button>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  )
                })}
              </div>
            )}
          </>
        ) : tab === 'notify' ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-barrete/5 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-barrete">
              {a.notifyTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">{a.notifyHint}</p>
            <p className="mt-3 text-sm font-medium text-ink/80">
              {a.notifyCount}:{' '}
              <span className="font-bold text-barrete">
                {subCount === null ? '—' : subCount}
              </span>
            </p>
            <form onSubmit={handleSendNotify} className="mt-5 space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">{a.notifySubject}</span>
                <input
                  type="text"
                  value={notifyForm.title}
                  onChange={(e) =>
                    setNotifyForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full rounded-xl border border-barrete/15 bg-creme px-3 py-2.5 text-sm outline-none focus:border-barrete/40"
                  maxLength={80}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">{a.notifyBody}</span>
                <textarea
                  value={notifyForm.body}
                  onChange={(e) =>
                    setNotifyForm((f) => ({ ...f, body: e.target.value }))
                  }
                  className="min-h-[100px] w-full rounded-xl border border-barrete/15 bg-creme px-3 py-2.5 text-sm outline-none focus:border-barrete/40"
                  maxLength={200}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  {a.notifyScheduledFor}
                </span>
                <input
                  type="datetime-local"
                  value={notifyForm.scheduledFor}
                  onChange={(e) =>
                    setNotifyForm((f) => ({ ...f, scheduledFor: e.target.value }))
                  }
                  className="w-full rounded-xl border border-barrete/15 bg-creme px-3 py-2.5 text-sm outline-none focus:border-barrete/40"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={notifySending}
                  className="inline-flex items-center gap-2 rounded-xl bg-dourado px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:brightness-105 disabled:opacity-60"
                >
                  {notifySending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {a.notifySending}
                    </>
                  ) : (
                    a.notifySend
                  )}
                </button>
                <button
                  type="button"
                  disabled={notifySending}
                  onClick={handleScheduleNotify}
                  className="inline-flex items-center gap-2 rounded-xl bg-barrete px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-60"
                >
                  {a.notifySchedule}
                </button>
              </div>
            </form>

            <div className="mt-8 border-t border-barrete/10 pt-5">
              <h3 className="font-display text-base font-semibold text-barrete">
                {a.notifyScheduledList}
              </h3>
              {schedules.length === 0 ? (
                <p className="mt-3 text-sm text-ink/45">{a.notifyNoScheduled}</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {schedules.map((job) => (
                    <li
                      key={job.id}
                      className="rounded-xl bg-creme/80 px-3 py-3 ring-1 ring-barrete/10"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink/50">
                          {job.status === 'pending'
                            ? a.notifyStatusPending
                            : job.status === 'sent'
                              ? a.notifyStatusSent
                              : a.notifyStatusCancelled}
                        </span>
                        <span className="text-xs text-ink/45">
                          {new Date(job.scheduled_for).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-ink">{job.title}</p>
                      <p className="text-xs text-ink/65">{job.body}</p>
                      {job.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => cancelSchedule(job.id)}
                          className="mt-2 text-xs font-semibold text-vermelho hover:underline"
                        >
                          {a.notifyCancelSchedule}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : tab === 'feedback' ? (
          loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-barrete" />
            </div>
          ) : feedbackList.length === 0 ? (
            <p className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-ink/50 ring-1 ring-barrete/5">
              {a.feedbackEmpty}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {feedbackList.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${
                    item.lido ? 'ring-barrete/5' : 'ring-dourado/40'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                        item.tipo === 'problema'
                          ? 'bg-vermelho/15 text-vermelho'
                          : 'bg-barrete/10 text-barrete'
                      }`}
                    >
                      {item.tipo === 'problema'
                        ? t.feedback.problem
                        : t.feedback.suggestion}
                    </span>
                    {!item.lido ? (
                      <span className="rounded-full bg-dourado/30 px-2 py-0.5 text-[0.65rem] font-semibold text-ink/80">
                        {a.feedbackUnread}
                      </span>
                    ) : null}
                    <span className="text-[0.7rem] text-ink/40">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">
                    {item.mensagem}
                  </p>
                  {item.contacto ? (
                    <p className="mt-1 text-xs text-ink/45">{item.contacto}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!item.lido ? (
                      <button
                        type="button"
                        onClick={() => markFeedbackRead(item.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-barrete/10 px-3 py-2 text-xs font-semibold text-barrete"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {a.feedbackMarkRead}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => deleteFeedback(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-vermelho/8 px-3 py-2 text-xs font-semibold text-vermelho"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {a.feedbackDelete}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-barrete" />
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <section>
              <h2 className="mb-3 font-display text-lg font-semibold text-vermelho">
                {a.pending}
                {pending.length ? ` (${pending.length})` : ''}
              </h2>
              {pending.length === 0 ? (
                <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-ink/45 ring-1 ring-barrete/5">
                  {a.noPending}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {pending.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-vermelho/15"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{n.nome}</p>
                        <span className="rounded-full bg-dourado/25 px-2 py-0.5 text-[0.65rem] font-semibold">
                          {t.businesses.types[n.tipo] || n.tipo}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink/70">{n.descricao}</p>
                      <p className="mt-1 text-xs text-ink/45">
                        {n.morada} · {n.telefone} · {n.email}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => approveBusiness(n.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-barrete px-3 py-2 text-xs font-semibold text-white"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {a.approve}
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectBusiness(n.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-vermelho/10 px-3 py-2 text-xs font-semibold text-vermelho"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {a.reject}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="mb-3 font-display text-lg font-semibold text-barrete">
                {a.approved}
                {approved.length ? ` (${approved.length})` : ''}
              </h2>
              {approved.length === 0 ? (
                <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-ink/45 ring-1 ring-barrete/5">
                  {a.noApproved}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {approved.map((n) => (
                    <li
                      key={n.id}
                      className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-barrete/5 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{n.nome}</p>
                        <p className="text-xs text-ink/50">
                          {t.businesses.types[n.tipo] || n.tipo} · {n.telefone}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => rejectBusiness(n.id)}
                        className="inline-flex items-center gap-1 self-start rounded-lg bg-vermelho/8 px-3 py-2 text-xs font-semibold text-vermelho"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {a.delete}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>

      {formOpen && (
        <EventForm
          event={editing}
          onSave={handleSave}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          t={a}
          uiT={t}
        />
      )}
    </div>
  )
}
