import { supabase } from './supabase'
import {
  isAndroid,
  isInAppBrowser,
  pushSupported,
  urlBase64ToUint8Array,
} from './push'
import { sanitizeAppPath } from './safeUrl'

function isIos() {
  const ua = window.navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

/** Guarda/actualiza subscrição via RPC (sem SELECT público das chaves push). */
export async function savePushSubscription(json) {
  if (!json?.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: new Error('missing keys') }
  }

  const { error } = await supabase.rpc('upsert_push_subscription', {
    p_endpoint: String(json.endpoint).slice(0, 2048),
    p_p256dh: String(json.keys.p256dh).slice(0, 512),
    p_auth: String(json.keys.auth).slice(0, 512),
    p_user_agent: String(navigator.userAgent || '').slice(0, 512),
  })

  if (error) return { ok: false, error }
  return { ok: true, endpoint: json.endpoint }
}

/**
 * Garante permissão + subscrição push guardada (necessária para lembrete com app fechada).
 * @returns {{ ok: true, endpoint: string } | { ok: false, reason: string }}
 */
export async function ensurePushForReminders() {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' }
  if (isInAppBrowser()) return { ok: false, reason: 'inApp' }
  if ((isIos() || isAndroid()) && !isStandalone()) {
    return { ok: false, reason: 'needInstall' }
  }

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidKey) return { ok: false, reason: 'vapid' }

  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch {
      /* ignore */
    }
  }
  if (Notification.permission !== 'granted') {
    return { ok: false, reason: 'denied' }
  }

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
  }

  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: 'keys' }
  }

  const saved = await savePushSubscription(json)
  if (!saved.ok) return { ok: false, reason: 'db' }
  return { ok: true, endpoint: saved.endpoint }
}

export async function scheduleServerReminder({
  eventId,
  endpoint,
  scheduledFor,
  title,
  body,
  url,
}) {
  if (!eventId || !endpoint || !scheduledFor) {
    return { message: 'missing_fields' }
  }

  const { error } = await supabase.rpc('schedule_event_reminder', {
    p_event_id: eventId,
    p_endpoint: endpoint,
    p_scheduled_for: scheduledFor,
    p_title: String(title || '').slice(0, 120),
    p_body: String(body || '').slice(0, 280),
    p_url: sanitizeAppPath(url, '/'),
  })
  return error
}

/** Cancela só o lembrete deste endpoint — endpoint obrigatório. */
export async function cancelServerReminder(eventId, endpoint) {
  if (!eventId || !endpoint) {
    return { message: 'missing_endpoint' }
  }
  const { error } = await supabase.rpc('cancel_event_reminder', {
    p_event_id: eventId,
    p_endpoint: endpoint,
  })
  return error
}

/** Dispara lembretes devidos no servidor (app fechada noutros dispositivos). */
export async function processDueReminders() {
  try {
    await supabase.functions.invoke('send-push', {
      body: { processReminders: true },
    })
  } catch (err) {
    console.error('processDueReminders', err)
  }
}

export async function getCurrentPushEndpoint() {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return sub?.endpoint || null
  } catch {
    return null
  }
}
