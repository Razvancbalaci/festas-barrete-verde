/** Protecção leve anti-spam em formulários públicos (cliente). */

export const FORM_COOLDOWN_MS = 30_000

export const FORM_SUBMIT_KEYS = {
  feedback: 'fbv:last-submit:feedback',
  negocios: 'fbv:last-submit:negocios',
}

export function getCooldownRemainingMs(storageKey, cooldownMs = FORM_COOLDOWN_MS) {
  try {
    const last = Number(globalThis.localStorage?.getItem(storageKey) || 0)
    if (!Number.isFinite(last) || last <= 0) return 0
    const left = last + cooldownMs - Date.now()
    return left > 0 ? left : 0
  } catch {
    return 0
  }
}

export function markFormSubmitted(storageKey) {
  try {
    globalThis.localStorage?.setItem(storageKey, String(Date.now()))
  } catch {
    /* private mode / blocked storage */
  }
}

/** true = bot provavelmente preencheu o honeypot */
export function isHoneypotFilled(value) {
  return String(value ?? '').trim().length > 0
}

export function formatCooldownSeconds(ms) {
  return Math.max(1, Math.ceil(ms / 1000))
}
