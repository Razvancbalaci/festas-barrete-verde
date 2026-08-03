import { describe, expect, it } from 'vitest'
import {
  buildAnalyticsReportModel,
  festivalReportRange,
  reportFilename,
  reportFilterMismatch,
  reportPeriodLabel,
  reportRpcArgs,
} from './analyticsReport'

const labels = {
  sectionVisits: 'Visitas',
  sectionProgram: 'Programa',
  sectionComercio: 'Comércio',
  sectionInstallPush: 'App e avisos',
  reportSectionFeedback: 'Feedback',
  reportFinalPeriod: '7 a 13 de Agosto 2026',
  reportDailyPeriod: '{weekday} {day} de Agosto',
  reportComercioViews: 'Visitas comércio',
  reportFeedbackProblem: 'Problema',
  reportFeedbackSuggestion: 'Sugestão',
  totalViews: 'Visitas',
  uniqueSessions: 'Sessões',
  pwaSessions: 'PWA',
  pwaPct: '% PWA',
  visitsByLang: 'Idiomas',
  retentionReturning: 'Regressaram',
  retentionOneDay: 'Só 1 dia',
  filterToday: 'Hoje',
  filterNow: 'Agora',
  filterFavorites: 'Favoritos',
  searches: 'Pesquisas',
  favoriteAdds: 'Favs',
  remindersSet: 'Lembretes',
  shares: 'Partilhas',
  topFavorites: 'Top favoritos',
  topShares: 'Top partilhas',
  comercioSubmits: 'Candidaturas',
  negociosPending: 'Pendentes',
  negociosApproved: 'Aprovados',
  feedbackTotal: 'Total feedback',
  feedbackUnread: 'Não lidos',
  feedbackByType: 'Por tipo',
  installShows: 'Shows install',
  installAccepts: 'Accepts',
  pwaInstalls: 'Installs',
  pushShows: 'Push shows',
  pushEnables: 'Push enables',
  pushActive: 'Activos',
}

const t = {
  title: 'Festas do Barrete Verde',
  subtitle: 'Alcochete · Agosto 2026',
  weekdaysFull: {
    fri: 'Sexta-feira',
    sat: 'Sábado',
    sun: 'Domingo',
    mon: 'Segunda-feira',
    tue: 'Terça-feira',
    wed: 'Quarta-feira',
    thu: 'Quinta-feira',
  },
}

const sampleData = {
  totals: {
    page_views: 100,
    unique_sessions: 40,
    pwa_sessions: 10,
    filter_today: 5,
    filter_now: 2,
    filter_favorites: 8,
    searches: 3,
    favorite_adds: 12,
    reminders_set: 4,
    shares: 6,
    comercio_submits: 2,
    install_prompt_shows: 9,
    install_prompt_accepts: 3,
    pwa_installs: 2,
    push_prompt_shows: 7,
    push_enables: 4,
  },
  visits_by_lang: [{ lang: 'pt', sessions: 30 }],
  retention: {
    returning_sessions: 8,
    one_day_sessions: 32,
    total_sessions: 40,
  },
  top_favorites: [{ event_id: 'e1', adds: 5 }],
  top_shares: [{ event_id: 'e2', count: 3 }],
  routes: [{ route: '/comercio', views: 15 }],
  negocios_pending: 1,
  negocios_approved: 4,
  feedback_total: 10,
  feedback_unread: 2,
  feedback_by_type: [
    { tipo: 'problema', count: 3 },
    { tipo: 'sugestao', count: 7 },
  ],
  push_subscribers: 20,
  push_subscribers_active: 15,
}

describe('festivalReportRange', () => {
  it('covers all FESTIVAL_DAYS', () => {
    expect(festivalReportRange()).toEqual({
      from: '2026-08-07',
      until: '2026-08-13',
    })
  })
})

describe('reportFilename', () => {
  it('names daily report by weekday', () => {
    expect(reportFilename('daily', '2026-08-07')).toBe(
      'relatorio-sexta-7-agosto.pdf',
    )
  })

  it('names final edition report', () => {
    expect(reportFilename('final', null)).toBe(
      'relatorio-final-festas-2026.pdf',
    )
  })
})

describe('reportPeriodLabel', () => {
  it('formats daily period', () => {
    expect(reportPeriodLabel('daily', '2026-08-07', t, labels)).toBe(
      'Sexta-feira 7 de Agosto',
    )
  })

  it('uses final period label', () => {
    expect(reportPeriodLabel('final', null, t, labels)).toBe(
      '7 a 13 de Agosto 2026',
    )
  })
})

describe('reportRpcArgs', () => {
  it('daily uses p_day', () => {
    expect(reportRpcArgs('daily', '2026-08-08')).toEqual({
      p_days: 14,
      p_day: '2026-08-08',
      p_include_prelaunch: false,
    })
  })

  it('clamps invalid daily day to first festival day', () => {
    expect(reportRpcArgs('daily', '2026-08-03').p_day).toBe('2026-08-07')
  })

  it('final uses festival range (same aggregation path)', () => {
    expect(reportRpcArgs('final', null)).toEqual({
      p_days: 90,
      p_day: null,
      p_from: '2026-08-07',
      p_until: '2026-08-13',
      p_include_prelaunch: false,
    })
  })

  it('prelaunch unlocks archive before soft cutoff', () => {
    expect(reportRpcArgs('prelaunch', null)).toEqual({
      p_days: 90,
      p_day: null,
      p_from: '2026-06-01',
      p_until: '2026-08-03',
      p_include_prelaunch: true,
    })
    expect(reportFilename('prelaunch', null)).toBe(
      'relatorio-pre-lancamento.pdf',
    )
  })
})

describe('reportFilterMismatch', () => {
  it('accepts matching daily filter', () => {
    expect(
      reportFilterMismatch('daily', '2026-08-07', {
        filter_day: '2026-08-07',
      }),
    ).toBeNull()
  })

  it('rejects when server ignored p_day', () => {
    expect(
      reportFilterMismatch('daily', '2026-08-07', { filter_day: null }),
    ).toBe('day')
  })

  it('rejects final when range missing', () => {
    expect(reportFilterMismatch('final', null, {})).toBe('range')
  })

  it('requires include_prelaunch flag for archive report', () => {
    expect(
      reportFilterMismatch('prelaunch', null, {
        include_prelaunch: true,
        launch_at: '2026-08-03T15:00:00Z',
      }),
    ).toBeNull()
    expect(reportFilterMismatch('prelaunch', null, {})).toBe('prelaunch')
  })
})

describe('buildAnalyticsReportModel', () => {
  it('includes only selected sections and reuses dashboard totals', () => {
    const model = buildAnalyticsReportModel(sampleData, {
      type: 'daily',
      dayIso: '2026-08-07',
      sections: ['visits', 'comercio'],
      labels,
      t,
      eventLabel: (id) => `Event ${id}`,
    })

    expect(model.filename).toBe('relatorio-sexta-7-agosto.pdf')
    expect(model.sections.map((s) => s.id)).toEqual(['visits', 'comercio'])
    expect(model.sections[0].metrics[0]).toEqual({
      label: 'Visitas',
      value: 100,
    })
    expect(model.sections[1].metrics[0]).toEqual({
      label: 'Visitas comércio',
      value: 15,
    })
  })

  it('final report adds retention metrics and top event lists', () => {
    const model = buildAnalyticsReportModel(sampleData, {
      type: 'final',
      dayIso: null,
      sections: ['visits', 'program', 'feedback'],
      labels,
      t,
      eventLabel: (id) => `Event ${id}`,
    })

    expect(model.period).toBe('7 a 13 de Agosto 2026')
    const visits = model.sections.find((s) => s.id === 'visits')
    expect(visits.metrics.some((m) => m.label === 'Regressaram')).toBe(true)

    const program = model.sections.find((s) => s.id === 'program')
    expect(program.lists[0].rows[0]).toEqual({
      label: 'Event e1',
      value: 5,
    })

    const feedback = model.sections.find((s) => s.id === 'feedback')
    expect(feedback.lists[0].rows[0].label).toBe('Problema')
  })
})
