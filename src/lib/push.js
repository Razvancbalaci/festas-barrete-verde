/**
 * Converte a chave VAPID pública (base64 URL-safe) num Uint8Array
 * para PushManager.subscribe().
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function isAndroid() {
  return /Android/i.test(navigator.userAgent || '')
}

/** WebViews / browsers in-app (Instagram, FB, etc.) — push costuma falhar. */
export function isInAppBrowser() {
  const ua = navigator.userAgent || ''
  return /FBAN|FBAV|Instagram|Line\/|Twitter|MicroMessenger|Snapchat|TikTok|GSA\//i.test(
    ua
  )
}

/**
 * Race a promise against a timeout. The original promise keeps running;
 * on timeout the race resolves/rejects with the given sentinel.
 */
export function raceTimeout(promise, ms, onTimeout) {
  let timer
  const clear = () => {
    if (timer != null) clearTimeout(timer)
  }
  return Promise.race([
    Promise.resolve(promise).finally(clear),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(onTimeout), ms)
    }),
  ])
}

const SW_WAIT_MS = 5000
const SUBSCRIBE_WAIT_MS = 15000

/**
 * Obtém o ServiceWorkerRegistration sem ficar preso em `ready`
 * (dev sem SW, Edge corporativo, políticas de grupo).
 */
export async function getPushServiceWorker(timeoutMs = SW_WAIT_MS) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    let reg = await navigator.serviceWorker.getRegistration()
    if (reg) return reg

    // Aguarda um pouco por registo em curso (produção / autoUpdate)
    reg = await raceTimeout(
      (async () => {
        // Pequena pausa para o plugin PWA registar
        await new Promise((r) => window.setTimeout(r, 400))
        const again = await navigator.serviceWorker.getRegistration()
        if (again) return again
        if (!navigator.serviceWorker.controller) return null
        return navigator.serviceWorker.ready
      })(),
      timeoutMs,
      null
    )
    return reg || null
  } catch {
    return null
  }
}

/**
 * Subscrição push com timeout — no Edge corporativo `subscribe()` pode nunca resolver.
 * @returns {{ ok: true, subscription: PushSubscription } | { ok: false, reason: string, error?: unknown }}
 */
export async function getOrCreatePushSubscription(
  reg,
  vapidKey,
  { timeoutMs = SUBSCRIBE_WAIT_MS, recreate = false } = {}
) {
  if (!reg?.pushManager || !vapidKey) {
    return { ok: false, reason: 'unsupported' }
  }

  try {
    let sub = await reg.pushManager.getSubscription()
    if (sub && recreate) {
      try {
        await sub.unsubscribe()
      } catch {
        /* ignore */
      }
      sub = null
    }
    if (sub) return { ok: true, subscription: sub }

    const result = await raceTimeout(
      reg.pushManager
        .subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
        .then((subscription) => ({ ok: true, subscription }))
        .catch((error) => ({ ok: false, reason: 'subscribe', error })),
      timeoutMs,
      { ok: false, reason: 'timeout' }
    )

    return result
  } catch (error) {
    return { ok: false, reason: 'subscribe', error }
  }
}
