/**
 * Timeout de sessão admin por inactividade.
 * Predefinição: 30 min. Override: VITE_ADMIN_IDLE_MINUTES=45
 */

export const ADMIN_IDLE_STORAGE_KEY = 'fbv-admin-last-active'
export const ADMIN_IDLE_EXPIRED_KEY = 'fbv-admin-session-expired'
export const ADMIN_IDLE_CHECK_MS = 15_000

const ACTIVITY_EVENTS = [
  'pointerdown',
  'keydown',
  'touchstart',
  'mousemove',
  'scroll',
  'visibilitychange',
]

export function adminIdleTimeoutMs(
  raw = import.meta.env.VITE_ADMIN_IDLE_MINUTES,
) {
  const mins = Number(raw)
  if (!Number.isFinite(mins) || mins <= 0) return 30 * 60_000
  return Math.min(Math.max(mins, 1), 24 * 60) * 60_000
}

export function readLastActiveAt() {
  try {
    const n = Number(sessionStorage.getItem(ADMIN_IDLE_STORAGE_KEY))
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export function touchAdminActivity(now = Date.now()) {
  try {
    sessionStorage.setItem(ADMIN_IDLE_STORAGE_KEY, String(now))
  } catch {
    /* ignore */
  }
  return now
}

export function clearAdminActivity() {
  try {
    sessionStorage.removeItem(ADMIN_IDLE_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function markAdminSessionExpired() {
  try {
    sessionStorage.setItem(ADMIN_IDLE_EXPIRED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function consumeAdminSessionExpired() {
  try {
    const hit = sessionStorage.getItem(ADMIN_IDLE_EXPIRED_KEY) === '1'
    if (hit) sessionStorage.removeItem(ADMIN_IDLE_EXPIRED_KEY)
    return hit
  } catch {
    return false
  }
}

/**
 * @param {number|null} lastActiveAt
 * @param {number} [now]
 * @param {number} [timeoutMs]
 */
export function isAdminIdleExpired(
  lastActiveAt,
  now = Date.now(),
  timeoutMs = adminIdleTimeoutMs(),
) {
  if (!lastActiveAt) return false
  return now - lastActiveAt >= timeoutMs
}

/**
 * Inicia tracking de actividade + logout por idle.
 * @returns {() => void} cleanup
 */
export function startAdminIdleWatch({
  onExpire,
  timeoutMs = adminIdleTimeoutMs(),
  now = () => Date.now(),
} = {}) {
  if (typeof window === 'undefined') return () => {}

  touchAdminActivity(now())
  let expired = false

  const bump = () => {
    if (expired) return
    if (document.visibilityState === 'hidden') return
    touchAdminActivity(now())
  }

  const check = () => {
    if (expired) return
    const last = readLastActiveAt() || touchAdminActivity(now())
    if (!isAdminIdleExpired(last, now(), timeoutMs)) return
    expired = true
    markAdminSessionExpired()
    clearAdminActivity()
    onExpire?.()
  }

  for (const ev of ACTIVITY_EVENTS) {
    window.addEventListener(ev, bump, { passive: true })
  }
  const timer = window.setInterval(check, ADMIN_IDLE_CHECK_MS)
  check()

  return () => {
    for (const ev of ACTIVITY_EVENTS) {
      window.removeEventListener(ev, bump)
    }
    window.clearInterval(timer)
  }
}
