import { supabase } from './supabase'
import {
  isAndroid,
  isInAppBrowser,
  pushSupported,
  urlBase64ToUint8Array,
} from './push'

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

async function saveSubscription(json) {
  const row = {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    user_agent: navigator.userAgent,
  }

  const { error: insertError } = await supabase.from('push_subscriptions').insert(row)
  if (!insertError) return { ok: true, endpoint: row.endpoint }

  if (insertError.code === '23505') {
    const { error: updateError } = await supabase
      .from('push_subscriptions')
      .update({
        p256dh: row.p256dh,
        auth: row.auth,
        user_agent: row.user_agent,
      })
      .eq('endpoint', row.endpoint)
    if (updateError) return { ok: false, error: updateError }
    return { ok: true, endpoint: row.endpoint }
  }

  return { ok: false, error: insertError }
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

  const saved = await saveSubscription(json)
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
  const row = {
    event_id: eventId,
    endpoint,
    scheduled_for: scheduledFor,
    title,
    body,
    url: url || '/',
    status: 'pending',
    sent_at: null,
  }

  // Upsert: se já existir para este evento+dispositivo, reactiva
  const { data: existing } = await supabase
    .from('event_reminders')
    .select('id')
    .eq('event_id', eventId)
    .eq('endpoint', endpoint)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await supabase
      .from('event_reminders')
      .update(row)
      .eq('id', existing.id)
    return error
  }

  const { error } = await supabase.from('event_reminders').insert(row)
  return error
}

export async function cancelServerReminder(eventId, endpoint) {
  if (!endpoint) return null
  const { error } = await supabase
    .from('event_reminders')
    .update({ status: 'cancelled' })
    .eq('event_id', eventId)
    .eq('endpoint', endpoint)
    .eq('status', 'pending')
  return error
}

/** Dispara lembretes devidos no servidor (funciona mesmo com a app fechada noutros dispositivos). */
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
