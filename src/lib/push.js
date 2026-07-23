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
