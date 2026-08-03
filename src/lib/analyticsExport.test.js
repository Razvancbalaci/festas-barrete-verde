import { describe, expect, it } from 'vitest'
import { buildAnalyticsCsv } from './analyticsExport'

describe('buildAnalyticsCsv', () => {
  it('includes summary and daily rows', () => {
    const csv = buildAnalyticsCsv(
      {
        days: 7,
        totals: { unique_sessions: 10, pwa_sessions: 4, reminders_set: 2, shares: 1 },
        summary: {
          today: { day: '2026-07-24', sessions: 3, reminders_set: 1, shares: 0 },
          yesterday: { day: '2026-07-23', sessions: 5, reminders_set: 0, shares: 1 },
        },
        visits_by_day: [{ day: '2026-07-23', views: 8, sessions: 5 }],
        visits_by_lang: [
          { lang: 'pt', sessions: 7 },
          { lang: 'en', sessions: 3 },
        ],
        retention: {
          returning_sessions: 2,
          one_day_sessions: 8,
          total_sessions: 10,
        },
        top_favorites: [{ event_id: 'e1', adds: 2 }],
        top_shares: [],
        top_reminders: [],
        top_map_places: [],
        recent_push_sends: [],
        push_subscribers: 4,
        push_subscribers_active: 3,
      },
      {
        eventLabel: (id) => `Event ${id}`,
        placeLabel: (id) => id,
        labels: {
          exportTitle: 'Analytics',
          exportPeriod: 'Days',
          sectionSummary: 'Summary',
          uniqueSessions: 'Sessions',
          pwaPct: 'PWA %',
          pushActive: 'Active',
          pushSubscribers: 'Total',
          remindersSet: 'Reminders',
          shares: 'Shares',
          exportToday: 'Today',
          exportYesterday: 'Yesterday',
          viewsByDay: 'By day',
          exportViews: 'Views',
          visitsByLang: 'By language',
          retentionTitle: 'Retention',
          retentionReturning: 'Returning',
          retentionOneDay: 'One-day',
          topFavorites: 'Favorites',
          topShares: 'Shares top',
          topReminders: 'Reminders top',
          topMapPlaces: 'Map',
          sectionPushHealth: 'Push',
          pushShows: 'Shows',
          pushEnables: 'Enables',
          recentSends: 'Sends',
          exportWhen: 'When',
          exportStatus: 'Status',
          exportCount: 'Count',
        },
      }
    )
    expect(csv).toContain('Sessions,10')
    expect(csv).toContain('Event e1,2')
    expect(csv).toContain('2026-07-23,8,5')
    expect(csv).toContain('PT,7')
    expect(csv).toContain('Returning,2')
  })
})
