import { FESTIVAL_DAYS } from '../data/days'

/**
 * Lançamento oficial (soft cutoff). Tem de coincidir com analytics.sql.
 * 2026-08-03 16:00 Europe/Lisbon.
 */
export const ANALYTICS_LAUNCH_AT = '2026-08-03T15:00:00.000Z'
export const ANALYTICS_LAUNCH_LABEL = '3 Ago 2026, 16:00 (Lisboa)'
/** Início do arquivo pré-lançamento (consulta histórica). */
export const PRELAUNCH_FROM = '2026-06-01'
export const PRELAUNCH_UNTIL = '2026-08-03'

/** Secções seleccionáveis no relatório. */
export const REPORT_SECTIONS = [
  { id: 'visits', labelKey: 'sectionVisits' },
  { id: 'program', labelKey: 'sectionProgram' },
  { id: 'comercio', labelKey: 'sectionComercio' },
  { id: 'feedback', labelKey: 'reportSectionFeedback' },
  { id: 'install', labelKey: 'sectionInstallPush' },
]

export const DEFAULT_REPORT_SECTIONS = REPORT_SECTIONS.map((s) => s.id)

/**
 * Intervalo inclusivo da edição (FESTIVAL_DAYS).
 * @returns {{ from: string, until: string }}
 */
export function festivalReportRange() {
  const from = FESTIVAL_DAYS[0].date
  const until = FESTIVAL_DAYS[FESTIVAL_DAYS.length - 1].date
  return { from, until }
}

/** Dia do relatório: só datas oficiais das festas. */
export function clampFestivalDay(dayIso) {
  if (dayIso && FESTIVAL_DAYS.some((d) => d.date === dayIso)) return dayIso
  return FESTIVAL_DAYS[0].date
}

/**
 * Confirma que a RPC aplicou o intervalo pedido (SQL desactualizado ignora p_day/p_from).
 * @returns {string|null} mensagem de erro ou null se ok
 */
export function reportFilterMismatch(type, dayIso, data) {
  if (!data || typeof data !== 'object') {
    return 'empty'
  }
  if (type === 'prelaunch') {
    if (!data.include_prelaunch) return 'prelaunch'
    if (!data.launch_at) return 'prelaunch'
    return null
  }
  if (type === 'daily') {
    const expected = clampFestivalDay(dayIso)
    const applied = data.filter_day ? String(data.filter_day).slice(0, 10) : null
    if (applied !== expected) return 'day'
    return null
  }
  const { from, until } = festivalReportRange()
  const appliedFrom = data.filter_from
    ? String(data.filter_from).slice(0, 10)
    : null
  const appliedUntil = data.filter_until
    ? String(data.filter_until).slice(0, 10)
    : null
  if (appliedFrom !== from || appliedUntil !== until) return 'range'
  return null
}

/**
 * Etiqueta do período para cabeçalho do relatório.
 * @param {'daily'|'final'|'prelaunch'} type
 * @param {string|null} dayIso
 * @param {object} t - translations root (para weekdaysFull) + analytics labels
 * @param {object} a - admin.analytics labels
 */
export function reportPeriodLabel(type, dayIso, t, a) {
  if (type === 'prelaunch') {
    return a.reportPrelaunchPeriod || 'Pré-lançamento (até 3 Ago 2026, 16:00)'
  }
  if (type === 'final') {
    return a.reportFinalPeriod || t.subtitle || '7–13 Agosto 2026'
  }
  const day = FESTIVAL_DAYS.find((d) => d.date === dayIso) || FESTIVAL_DAYS[0]
  const weekday = t.weekdaysFull?.[day.weekdayKey] || day.weekdayKey
  return a.reportDailyPeriod
    ?.replace('{weekday}', weekday)
    .replace('{day}', String(day.dayNum))
    || `${weekday} ${day.dayNum} Agosto`
}

/**
 * Nome de ficheiro amigável.
 * @param {'daily'|'final'|'prelaunch'} type
 * @param {string|null} dayIso
 */
export function reportFilename(type, dayIso) {
  if (type === 'prelaunch') return 'relatorio-pre-lancamento.pdf'
  if (type === 'final') return 'relatorio-final-festas-2026.pdf'
  const day = FESTIVAL_DAYS.find((d) => d.date === dayIso) || FESTIVAL_DAYS[0]
  const slug = {
    fri: 'sexta',
    sat: 'sabado',
    sun: 'domingo',
    mon: 'segunda',
    tue: 'terca',
    wed: 'quarta',
    thu: 'quinta',
  }[day.weekdayKey] || day.weekdayKey
  return `relatorio-${slug}-${day.dayNum}-agosto.pdf`
}

function pct(part, whole) {
  const p = Number(part) || 0
  const w = Number(whole) || 0
  if (!w) return null
  return Math.round((100 * p) / w)
}

function topN(rows, n = 5) {
  return Array.isArray(rows) ? rows.slice(0, n) : []
}

/**
 * Constrói o modelo do relatório a partir do payload de get_analytics_dashboard.
 * Sem recálculos — só formatação das agregações já feitas no servidor.
 *
 * @param {object} data
 * @param {object} opts
 * @param {'daily'|'final'} opts.type
 * @param {string|null} opts.dayIso
 * @param {string[]} opts.sections
 * @param {object} opts.labels - admin.analytics
 * @param {object} opts.t - translations root
 * @param {(id: string) => string} opts.eventLabel
 * @param {(id: string) => string} [opts.placeLabel]
 */
export function buildAnalyticsReportModel(data, opts) {
  const {
    type,
    dayIso = null,
    sections = DEFAULT_REPORT_SECTIONS,
    labels: a,
    t,
    eventLabel,
  } = opts

  const totals = data?.totals || {}
  const selected = new Set(sections)
  const period = reportPeriodLabel(type, dayIso, t, a)
  const brandTitle = t.title || 'Festas do Barrete Verde'
  const generatedAt = new Date()

  const out = {
    brandTitle,
    brandSubtitle: t.subtitle || '',
    period,
    type,
    generatedAt,
    filename: reportFilename(type, dayIso),
    sections: [],
  }

  if (selected.has('visits')) {
    const rows = [
      { label: a.totalViews, value: totals.page_views ?? 0 },
      { label: a.uniqueSessions, value: totals.unique_sessions ?? 0 },
      { label: a.pwaSessions, value: totals.pwa_sessions ?? 0 },
      {
        label: a.pwaPct,
        value:
          pct(totals.pwa_sessions, totals.unique_sessions) != null
            ? `${pct(totals.pwa_sessions, totals.unique_sessions)}%`
            : '—',
      },
    ]
    const langRows = topN(data?.visits_by_lang || [], 6).map((r) => ({
      label: String(r.lang || '?').toUpperCase(),
      value: r.sessions ?? 0,
    }))
    const retention = data?.retention || {}
    if ((type === 'final' || type === 'prelaunch') && retention.total_sessions) {
      rows.push({
        label: a.retentionReturning,
        value: `${retention.returning_sessions ?? 0} (${pct(retention.returning_sessions, retention.total_sessions) ?? 0}%)`,
      })
      rows.push({
        label: a.retentionOneDay,
        value: `${retention.one_day_sessions ?? 0} (${pct(retention.one_day_sessions, retention.total_sessions) ?? 0}%)`,
      })
    }
    out.sections.push({
      id: 'visits',
      title: a.sectionVisits,
      metrics: rows,
      lists: langRows.length
        ? [{ title: a.visitsByLang || a.languages, rows: langRows }]
        : [],
    })
  }

  if (selected.has('program')) {
    const favs = topN(data?.top_favorites || [], 5).map((r) => ({
      label: eventLabel(r.event_id),
      value: r.adds ?? 0,
    }))
    const shares = topN(data?.top_shares || [], 5).map((r) => ({
      label: eventLabel(r.event_id),
      value: r.count ?? 0,
    }))
    out.sections.push({
      id: 'program',
      title: a.sectionProgram,
      metrics: [
        { label: a.filterToday, value: totals.filter_today ?? 0 },
        { label: a.filterNow, value: totals.filter_now ?? 0 },
        { label: a.filterFavorites, value: totals.filter_favorites ?? 0 },
        { label: a.searches, value: totals.searches ?? 0 },
        { label: a.favoriteAdds, value: totals.favorite_adds ?? 0 },
        { label: a.remindersSet, value: totals.reminders_set ?? 0 },
        { label: a.shares, value: totals.shares ?? 0 },
      ],
      lists: [
        ...(favs.length ? [{ title: a.topFavorites, rows: favs }] : []),
        ...(shares.length ? [{ title: a.topShares, rows: shares }] : []),
      ],
    })
  }

  if (selected.has('comercio')) {
    const comercioViews =
      (data?.routes || []).find((r) => String(r.route || '').includes('comercio'))
        ?.views ?? 0
    out.sections.push({
      id: 'comercio',
      title: a.sectionComercio,
      metrics: [
        { label: a.reportComercioViews || a.sectionComercio, value: comercioViews },
        { label: a.comercioSubmits, value: totals.comercio_submits ?? 0 },
        { label: a.negociosPending, value: data?.negocios_pending ?? 0 },
        { label: a.negociosApproved, value: data?.negocios_approved ?? 0 },
      ],
      lists: [],
    })
  }

  if (selected.has('feedback')) {
    const byType = (data?.feedback_by_type || []).map((r) => ({
      label: r.tipo === 'problema' ? (a.reportFeedbackProblem || 'problema') : (a.reportFeedbackSuggestion || r.tipo),
      value: r.count ?? 0,
    }))
    out.sections.push({
      id: 'feedback',
      title: a.reportSectionFeedback || a.feedbackTotal,
      metrics: [
        { label: a.feedbackTotal, value: data?.feedback_total ?? 0 },
        { label: a.feedbackUnread, value: data?.feedback_unread ?? 0 },
      ],
      lists: byType.length
        ? [{ title: a.feedbackByType, rows: byType }]
        : [],
    })
  }

  if (selected.has('install')) {
    out.sections.push({
      id: 'install',
      title: a.sectionInstallPush,
      metrics: [
        { label: a.installShows, value: totals.install_prompt_shows ?? 0 },
        { label: a.installAccepts, value: totals.install_prompt_accepts ?? 0 },
        { label: a.pwaInstalls, value: totals.pwa_installs ?? 0 },
        { label: a.pushShows, value: totals.push_prompt_shows ?? 0 },
        { label: a.pushEnables, value: totals.push_enables ?? 0 },
        {
          label: a.pushActive,
          value:
            data?.push_subscribers_active != null
              ? `${data.push_subscribers_active}${data.push_subscribers != null ? ` / ${data.push_subscribers}` : ''}`
              : (data?.push_subscribers ?? '—'),
        },
      ],
      lists: [],
    })
  }

  return out
}

/**
 * Args RPC para o tipo de relatório (mesma agregação, intervalos diferentes).
 */
export function reportRpcArgs(type, dayIso) {
  if (type === 'prelaunch') {
    return {
      p_days: 90,
      p_day: null,
      p_from: PRELAUNCH_FROM,
      p_until: PRELAUNCH_UNTIL,
      p_include_prelaunch: true,
    }
  }
  if (type === 'daily') {
    return {
      p_days: 14,
      p_day: clampFestivalDay(dayIso),
      p_include_prelaunch: false,
    }
  }
  const { from, until } = festivalReportRange()
  return {
    p_days: 90,
    p_day: null,
    p_from: from,
    p_until: until,
    p_include_prelaunch: false,
  }
}
