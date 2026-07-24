import { supabase } from './supabase'

const SESSION_KEY = 'fbv-analytics-session'

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export function getAnalyticsSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id || id.length < 8) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  }
}

const queue = []
let flushTimer = null
let flushing = false

async function flushQueue() {
  if (flushing || queue.length === 0) return
  flushing = true
  const batch = queue.splice(0, queue.length)
  try {
    for (const item of batch) {
      await supabase.rpc('record_analytics_event', {
        p_event_name: item.name,
        p_payload: item.payload,
        p_session_id: item.sessionId,
      })
    }
  } catch {
    /* fire-and-forget */
  } finally {
    flushing = false
    if (queue.length > 0) scheduleFlush()
  }
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    flushQueue()
  }, 2000)
}

/** Regista evento anónimo (sem PII). Falha silenciosamente se o SQL ainda não correu. */
export function track(eventName, payload = {}) {
  if (typeof window === 'undefined') return
  if (window.location.pathname.startsWith('/admin')) return

  queue.push({
    name: eventName,
    payload,
    sessionId: getAnalyticsSessionId(),
  })
  scheduleFlush()
}

export function trackPageView(route, extra = {}) {
  track('page_view', {
    route,
    lang: extra.lang || null,
    standalone: isStandalone(),
    ...extra,
  })
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushQueue()
  })
}
