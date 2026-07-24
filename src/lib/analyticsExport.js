/** Escape a CSV cell (RFC-style quotes). */
function cell(value) {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function row(values) {
  return values.map(cell).join(',')
}

/**
 * Build a simple CSV report from the analytics dashboard payload.
 * @param {object} data - get_analytics_dashboard result
 * @param {object} opts
 * @param {(id: string) => string} opts.eventLabel
 * @param {(id: string) => string} opts.placeLabel
 * @param {object} opts.labels - i18n strings (admin.analytics)
 */
export function buildAnalyticsCsv(data, { eventLabel, placeLabel, labels: a }) {
  const lines = []
  const totals = data?.totals || {}
  const summary = data?.summary || {}
  const today = summary.today || {}
  const yesterday = summary.yesterday || {}

  lines.push(row([a.exportTitle || 'Analytics']))
  lines.push(row([a.exportPeriod || 'Period (days)', data?.days ?? '']))
  lines.push(row([]))

  lines.push(row([a.sectionSummary || 'Summary']))
  lines.push(row([a.uniqueSessions, totals.unique_sessions ?? 0]))
  lines.push(
    row([
      a.pwaPct || 'PWA %',
      totals.unique_sessions
        ? Math.round((100 * (totals.pwa_sessions || 0)) / totals.unique_sessions)
        : 0,
    ])
  )
  lines.push(row([a.pushActive || 'Push active', data?.push_subscribers_active ?? '']))
  lines.push(row([a.pushSubscribers, data?.push_subscribers ?? '']))
  lines.push(row([a.remindersSet, totals.reminders_set ?? 0]))
  lines.push(row([a.shares, totals.shares ?? 0]))
  lines.push(row([]))

  lines.push(row([a.exportToday || 'Today', today.day || '']))
  lines.push(row([a.uniqueSessions, today.sessions ?? 0]))
  lines.push(row([a.remindersSet, today.reminders_set ?? 0]))
  lines.push(row([a.shares, today.shares ?? 0]))
  lines.push(row([a.exportYesterday || 'Yesterday', yesterday.day || '']))
  lines.push(row([a.uniqueSessions, yesterday.sessions ?? 0]))
  lines.push(row([a.remindersSet, yesterday.reminders_set ?? 0]))
  lines.push(row([a.shares, yesterday.shares ?? 0]))
  lines.push(row([]))

  lines.push(row([a.viewsByDay, a.exportViews || 'Views', a.uniqueSessions]))
  for (const r of data?.visits_by_day || []) {
    lines.push(row([r.day, r.views ?? 0, r.sessions ?? 0]))
  }
  lines.push(row([]))

  lines.push(row([a.topFavorites, a.exportCount || 'Count']))
  for (const r of data?.top_favorites || []) {
    lines.push(row([eventLabel(r.event_id), r.adds ?? 0]))
  }
  lines.push(row([]))

  lines.push(row([a.topShares, a.exportCount || 'Count']))
  for (const r of data?.top_shares || []) {
    lines.push(row([eventLabel(r.event_id), r.count ?? 0]))
  }
  lines.push(row([]))

  lines.push(row([a.topReminders, a.exportCount || 'Count']))
  for (const r of data?.top_reminders || []) {
    lines.push(row([eventLabel(r.event_id), r.count ?? 0]))
  }
  lines.push(row([]))

  lines.push(row([a.topMapPlaces, a.exportCount || 'Count']))
  for (const r of data?.top_map_places || []) {
    lines.push(row([placeLabel(r.place_id), r.views ?? 0]))
  }
  lines.push(row([]))

  lines.push(row([a.sectionPushHealth || 'Push', a.exportCount || 'Count']))
  lines.push(row([a.pushShows, totals.push_prompt_shows ?? 0]))
  lines.push(row([a.pushEnables, totals.push_enables ?? 0]))
  lines.push(row([a.pushActive || 'Push active', data?.push_subscribers_active ?? '']))
  lines.push(row([a.pushSubscribers, data?.push_subscribers ?? '']))
  lines.push(row([]))

  lines.push(
    row([
      a.recentSends || 'Recent sends',
      a.exportWhen || 'When',
      a.exportStatus || 'Status',
    ])
  )
  for (const r of data?.recent_push_sends || []) {
    lines.push(row([r.title, r.sent_at, r.status]))
  }

  return `${lines.join('\r\n')}\r\n`
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([`\uFEFF${csvText}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
