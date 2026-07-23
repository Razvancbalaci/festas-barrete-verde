import { eventDateTime } from './datetime'
import { isCorridaEvent, isStreetBullEvent } from './locations'

/** Actuação no Palco S. João (não confundir com rotas que passam no Largo). */
export function isPalcoSJoaoShow(event) {
  return /palco\s*s\.?\s*jo[aã]o/i.test(String(event?.local || ''))
}

/**
 * Alertas broadcast pré-definidos a partir do programa:
 * - 15 min antes de largadas/entradas/toiros de rua
 * - 1 h antes de corridas
 * - 15 min antes de actuações no Palco S. João
 */
export function buildAutoAlertJobs(events, now = new Date()) {
  const jobs = []
  const nowMs = now.getTime()

  for (const event of events || []) {
    if (!event?.id || !event.dia || !event.hora) continue
    const start = eventDateTime(event.dia, event.hora)
    const titulo = String(event.titulo || '').trim() || 'Evento das festas'

    if (isStreetBullEvent(event)) {
      const when = new Date(start.getTime() - 15 * 60 * 1000)
      if (when.getTime() > nowMs) {
        jobs.push({
          dedupe_key: `auto:street:${event.id}:15`,
          title: 'Toiros em 15 min',
          body: titulo.slice(0, 200),
          scheduled_for: when.toISOString(),
        })
      }
    }

    if (isCorridaEvent(event)) {
      const when = new Date(start.getTime() - 60 * 60 * 1000)
      if (when.getTime() > nowMs) {
        jobs.push({
          dedupe_key: `auto:corrida:${event.id}:60`,
          title: 'Corrida em 1 hora',
          body: titulo.slice(0, 200),
          scheduled_for: when.toISOString(),
        })
      }
    }

    if (isPalcoSJoaoShow(event)) {
      const when = new Date(start.getTime() - 15 * 60 * 1000)
      if (when.getTime() > nowMs) {
        jobs.push({
          dedupe_key: `auto:sjoao:${event.id}:15`,
          title: 'Palco S. João em 15 min',
          body: titulo.slice(0, 200),
          scheduled_for: when.toISOString(),
        })
      }
    }
  }

  return jobs
}
