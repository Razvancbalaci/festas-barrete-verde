import { eventDateTime } from './datetime'
import { isCorridaEvent, isStreetBullEvent } from './locations'

/** Minutos antes do início do evento (fixos — não alterar sem testes). */
export const AUTO_ALERT_OFFSETS = {
  streetMinutes: 15,
  corridaMinutes: 60,
  sjoaoMinutes: 15,
}

/** Actuação no Palco S. João (não confundir com rotas que passam no Largo). */
export function isPalcoSJoaoShow(event) {
  return /palco\s*(?:s\.?\s*|são\s+)jo[aã]o/i.test(String(event?.local || ''))
}

/**
 * Calcula o instante do alerta = início − N minutos.
 * Devolve null se já passou, se o offset for inválido, ou se o cálculo não bater certo.
 */
export function alertFireTime(eventStart, minutesBefore, now = new Date()) {
  const mins = Number(minutesBefore)
  if (!Number.isFinite(mins) || mins <= 0 || mins > 24 * 60) return null
  if (!(eventStart instanceof Date) || Number.isNaN(eventStart.getTime())) return null

  const whenMs = eventStart.getTime() - mins * 60 * 1000
  const nowMs = now.getTime()
  if (whenMs <= nowMs) return null
  if (whenMs >= eventStart.getTime()) return null

  // Guarda: o atraso até ao evento tem de ser exactamente N minutos (±1s)
  const delta = eventStart.getTime() - whenMs
  if (Math.abs(delta - mins * 60 * 1000) > 1000) return null

  // Guarda: não agendar mais de ~40 dias à frente (festas + margem)
  if (whenMs - nowMs > 40 * 24 * 60 * 60 * 1000) return null

  return new Date(whenMs)
}

/**
 * Alertas broadcast pré-definidos a partir do programa:
 * - 15 min antes de largadas/entradas/toiros de rua
 * - 1 h antes de corridas
 * - 15 min antes de actuações no Palco S. João
 */
export function buildAutoAlertJobs(events, now = new Date()) {
  const jobs = []
  const seen = new Set()

  for (const event of events || []) {
    if (!event?.id || !event.dia || !event.hora) continue
    const start = eventDateTime(event.dia, event.hora)
    if (Number.isNaN(start.getTime())) continue
    const titulo = String(event.titulo || '').trim() || 'Evento das festas'

    const pushJob = (kind, minutes, title) => {
      const when = alertFireTime(start, minutes, now)
      if (!when) return
      const dedupe_key = `auto:${kind}:${event.id}:${minutes}`
      if (seen.has(dedupe_key)) return
      seen.add(dedupe_key)
      jobs.push({
        dedupe_key,
        title,
        body: titulo.slice(0, 200),
        scheduled_for: when.toISOString(),
        // metadados só para testes / debug (não vão para a BD se o insert os ignorar)
        _event_id: event.id,
        _event_start: start.toISOString(),
        _minutes_before: minutes,
      })
    }

    if (isStreetBullEvent(event)) {
      pushJob('street', AUTO_ALERT_OFFSETS.streetMinutes, 'Toiros em 15 min')
    }

    if (isCorridaEvent(event)) {
      pushJob('corrida', AUTO_ALERT_OFFSETS.corridaMinutes, 'Corrida em 1 hora')
    }

    if (isPalcoSJoaoShow(event)) {
      pushJob('sjoao', AUTO_ALERT_OFFSETS.sjoaoMinutes, 'Palco S. João em 15 min')
    }
  }

  return jobs
}

/** Remove campos internos antes de gravar na BD. */
export function toScheduleRow(job) {
  return {
    dedupe_key: job.dedupe_key,
    title: job.title,
    body: job.body,
    scheduled_for: job.scheduled_for,
    status: 'pending',
  }
}
