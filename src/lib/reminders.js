import { supabase } from './supabase'
import {
  getOrCreatePushSubscription,
  getPushServiceWorker,
  isAndroid,
  isInAppBrowser,
  pushSupported,
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

  const reg = await getPushServiceWorker()
  if (!reg) return { ok: false, reason: 'sw' }

  const created = await getOrCreatePushSubscription(reg, vapidKey, {
    recreate: isAndroid(),
  })
  if (!created.ok) {
    return { ok: false, reason: created.reason || 'subscribe' }
  }

  const json = created.subscription.toJSON()
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
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
    const reg = await getPushServiceWorker(1500)
    if (!reg?.pushManager) return null
    const sub = await reg.pushManager.getSubscription()
    return sub?.endpoint || null
  } catch {
    return null
  }
}

const DEFAULT_PREFS = {
  pref_street: true,
  pref_corrida: true,
  pref_sjoao: true,
  pref_broadcast: true,
}

export async function fetchPushPreferences() {
  try {
    const endpoint = await getCurrentPushEndpoint()
    if (!endpoint) {
      return { ...DEFAULT_PREFS, subscribed: false, endpoint: null }
    }
    const { data, error } = await supabase.rpc('get_push_preferences', {
      p_endpoint: endpoint,
    })
    if (error || !data) {
      // RPC ainda não existe / rede — mostrar defaults e pedir activar se preciso
      return { ...DEFAULT_PREFS, subscribed: false, endpoint }
    }
    return {
      subscribed: Boolean(data.subscribed),
      endpoint,
      pref_street: data.pref_street !== false,
      pref_corrida: data.pref_corrida !== false,
      pref_sjoao: data.pref_sjoao !== false,
      pref_broadcast: data.pref_broadcast !== false,
    }
  } catch {
    return { ...DEFAULT_PREFS, subscribed: false, endpoint: null }
  }
}

export async function savePushPreferences(prefs) {
  const endpoint = await getCurrentPushEndpoint()
  if (!endpoint) return { ok: false, reason: 'no_endpoint' }

  const { data, error } = await supabase.rpc('update_push_preferences', {
    p_endpoint: endpoint,
    p_pref_street: Boolean(prefs.pref_street),
    p_pref_corrida: Boolean(prefs.pref_corrida),
    p_pref_sjoao: Boolean(prefs.pref_sjoao),
    p_pref_broadcast: Boolean(prefs.pref_broadcast),
  })
  if (error) return { ok: false, reason: 'rpc', error }
  if (data?.ok === false) return { ok: false, reason: data.reason || 'not_subscribed' }
  return { ok: true }
}
