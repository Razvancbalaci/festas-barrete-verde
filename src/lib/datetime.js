/** Data civil local (YYYY-MM-DD), sem UTC. */
export function localDateIso(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Ordenação de horas HH:MM — madrugada (00–05) depois da noite do mesmo dia de cartaz.
 */
export function timeSortKey(hora) {
  const match = String(hora).match(/(\d{1,2}):(\d{2})/)
  if (!match) return 0
  let h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  if (h >= 0 && h < 6) h += 24
  return h * 60 + m
}

/**
 * Combina dia + hora do cartaz num Date local.
 * Horas 00:00–05:59 contam como madrugada a seguir à noite desse dia (dia+1).
 */
export function eventDateTime(dia, hora) {
  const [hh, mm] = String(hora)
    .split(':')
    .map((n) => parseInt(n, 10))
  const h = Number.isFinite(hh) ? hh : 0
  const m = Number.isFinite(mm) ? mm : 0
  const d = new Date(`${dia}T00:00:00`)
  if (h >= 0 && h < 6) {
    d.setDate(d.getDate() + 1)
  }
  d.setHours(h, m, 0, 0)
  return d
}

/** Duração estimada (min) para «Agora» / em curso. */
export function eventDurationMinutes(event) {
  if (event?.categoria === 'Toiros') {
    if (/corrida|recortadores/i.test(event.titulo || '') || event.bilhetes_url) {
      return 150
    }
    return 60
  }
  if (event?.categoria === 'Música') return 120
  if (event?.categoria === 'Pirotecnia') return 30
  if (event?.categoria === 'Religioso') return 90
  return 90
}

/** Evento em curso ou o próximo ainda por começar. */
export function findNextOrCurrentEvent(events, now = new Date()) {
  if (!events?.length) return null
  let current = null
  let next = null
  for (const e of events) {
    const start = eventDateTime(e.dia, e.hora)
    const end = new Date(start.getTime() + eventDurationMinutes(e) * 60 * 1000)
    if (now >= start && now <= end) {
      current = e
      break
    }
    if (start > now && (!next || start < eventDateTime(next.dia, next.hora))) {
      next = e
    }
  }
  return current || next || null
}

export function sortEvents(list) {
  return [...(list || [])].sort((a, b) => {
    const d = String(a.dia).localeCompare(String(b.dia))
    if (d !== 0) return d
    const tDiff = timeSortKey(a.hora) - timeSortKey(b.hora)
    if (tDiff !== 0) return tDiff
    return (a.ordem ?? 0) - (b.ordem ?? 0)
  })
}

/** Parse valor de lembrete local: `local:ISO` ou `local:ISO|YYYY-MM-DD`. */
export function parseLocalReminderValue(raw) {
  const s = String(raw || '')
  if (!s.startsWith('local:')) return null
  const rest = s.slice(6)
  const pipe = rest.indexOf('|')
  if (pipe === -1) return { whenIso: rest, dia: null }
  return { whenIso: rest.slice(0, pipe), dia: rest.slice(pipe + 1) || null }
}

export function formatLocalReminderValue(whenIso, dia) {
  return dia ? `local:${whenIso}|${dia}` : `local:${whenIso}`
}
