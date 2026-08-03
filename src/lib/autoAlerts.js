import { eventDateTime } from './datetime'
import { isCorridaEvent, isStreetBullEvent } from './locations'

/** Minutos antes do início do evento (fixos — não alterar sem testes). */
export const AUTO_ALERT_OFFSETS = {
  streetMinutes: 15,
  corridaMinutes: 60,
  sjoaoMinutes: 15,
  fogosMinutes: 15,
  inicioMinutes: 30,
}

/** Actuação no Palco S. João (não confundir com rotas que passam no Largo). */
export function isPalcoSJoaoShow(event) {
  return /palco\s*(?:s\.?\s*|são\s+)jo[aã]o/i.test(String(event?.local || ''))
}

/** Fogos / espetáculo piromusical (não inclui alvoradas com morteiros). */
export function isFireworksEvent(event) {
  const cat = String(event?.categoria || '')
  const title = String(event?.titulo || '')
  if (/pirotecnia/i.test(cat)) return true
  return /piromusical|fogos?\s+de\s+artif|fogo\s+de\s+artif|castelo\s+de\s+fogos/i.test(
    title,
  )
}

/** Cerimónia de abertura oficial (Hastear das bandeiras). */
export function isFestivalOpeningEvent(event) {
  return /hastear\s+das\s+bandeiras/i.test(String(event?.titulo || ''))
}

/** Eventos que geram alertas automáticos do programa. */
export function eventNeedsAutoAlert(event) {
  if (!event) return false
  return (
    isStreetBullEvent(event) ||
    isCorridaEvent(event) ||
    isPalcoSJoaoShow(event) ||
    isFireworksEvent(event) ||
    isFestivalOpeningEvent(event)
  )
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
 * - 15 min antes dos fogos / piromusical
 * - 30 min antes do Hastear das bandeiras (começo das festas)
 */
export function buildAutoAlertJobs(events, now = new Date()) {
  const jobs = []
  const seen = new Set()

  for (const event of events || []) {
    if (!event?.id || !event.dia || !event.hora) continue
    const start = eventDateTime(event.dia, event.hora)
    if (Number.isNaN(start.getTime())) continue
    const titulo = String(event.titulo || '').trim() || 'Evento das festas'

    const pushJob = (kind, minutes, title, bodyText = titulo) => {
      const when = alertFireTime(start, minutes, now)
      if (!when) return
      const dedupe_key = `auto:${kind}:${event.id}:${minutes}`
      if (seen.has(dedupe_key)) return
      seen.add(dedupe_key)
      jobs.push({
        dedupe_key,
        category: kind,
        title,
        body: String(bodyText || titulo).slice(0, 200),
        scheduled_for: when.toISOString(),
        // metadados só para testes / debug (não vão para a BD se o insert os ignorar)
        _event_id: event.id,
        _event_start: start.toISOString(),
        _minutes_before: minutes,
      })
    }

    if (isStreetBullEvent(event)) {
      pushJob(
        'street',
        AUTO_ALERT_OFFSETS.streetMinutes,
        streetBullAlertTitle(event),
      )
    }

    if (isCorridaEvent(event)) {
      pushJob(
        'corrida',
        AUTO_ALERT_OFFSETS.corridaMinutes,
        'Corrida de toiros em 1 hora!',
      )
    }

    if (isPalcoSJoaoShow(event)) {
      pushJob(
        'sjoao',
        AUTO_ALERT_OFFSETS.sjoaoMinutes,
        'Espetáculo no Palco S. João em 15 minutos!',
      )
    }

    if (isFireworksEvent(event)) {
      pushJob(
        'fogos',
        AUTO_ALERT_OFFSETS.fogosMinutes,
        'Fogos de artifício em 15 minutos!',
        'Espetáculo Piromusical pelo Passeio do Tejo!',
      )
    }

    if (isFestivalOpeningEvent(event)) {
      pushJob(
        'inicio',
        AUTO_ALERT_OFFSETS.inicioMinutes,
        'As festas de Alcochete começam em 30 minutos!',
      )
    }
  }

  return jobs
}

/** Título do push para toiros de rua (entrada / largada / outros). */
export function streetBullAlertTitle(event) {
  const title = String(event?.titulo || '')
  if (/entrada/i.test(title)) return 'Entrada de toiros em 15 minutos!'
  if (/largada/i.test(title)) return 'Largada de toiros em 15 minutos!'
  return 'Toiros na rua em 15 minutos!'
}

/** Remove campos internos antes de gravar na BD. */
export function toScheduleRow(job) {
  const fromKey = String(job.dedupe_key || '').match(/^auto:([a-z]+):/)
  const category = job.category || fromKey?.[1] || 'broadcast'
  return {
    dedupe_key: job.dedupe_key,
    category,
    title: job.title,
    body: job.body,
    scheduled_for: job.scheduled_for,
    status: 'pending',
  }
}
