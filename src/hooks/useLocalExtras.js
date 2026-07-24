import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { parseLocalReminderValue } from '../lib/datetime'
import { processDueReminders } from '../lib/reminders'
import { track } from '../lib/analytics'
import { getPushServiceWorker } from '../lib/push'

export { eventDateTime } from '../lib/datetime'

const FAV_KEY = 'fbv-favorites'
const REM_KEY = 'fbv-reminders'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

let favListeners = new Set()
let remListeners = new Set()

function emit(listeners) {
  listeners.forEach((l) => l())
}

function subscribeFav(cb) {
  favListeners.add(cb)
  return () => favListeners.delete(cb)
}

function subscribeRem(cb) {
  remListeners.add(cb)
  return () => remListeners.delete(cb)
}

function getFavoritesSnapshot() {
  return JSON.stringify(readJson(FAV_KEY, []))
}

function getRemindersSnapshot() {
  return JSON.stringify(readJson(REM_KEY, {}))
}

export function useFavorites() {
  const snap = useSyncExternalStore(subscribeFav, getFavoritesSnapshot, () => '[]')
  const ids = JSON.parse(snap)

  const toggle = useCallback((id) => {
    const current = readJson(FAV_KEY, [])
    const adding = !current.includes(id)
    const next = adding
      ? [...current, id]
      : current.filter((x) => x !== id)
    writeJson(FAV_KEY, next)
    emit(favListeners)
    track(adding ? 'favorite_add' : 'favorite_remove', { event_id: id })
  }, [])

  const has = useCallback((id) => ids.includes(id), [ids])

  return { ids, toggle, has, count: ids.length }
}

export function useReminders() {
  const snap = useSyncExternalStore(subscribeRem, getRemindersSnapshot, () => '{}')
  const map = JSON.parse(snap)

  const setReminder = useCallback((eventId, whenIso) => {
    const current = readJson(REM_KEY, {})
    current[eventId] = whenIso
    writeJson(REM_KEY, current)
    emit(remListeners)
  }, [])

  const clearReminder = useCallback((eventId) => {
    const current = readJson(REM_KEY, {})
    delete current[eventId]
    writeJson(REM_KEY, current)
    emit(remListeners)
  }, [])

  const getReminder = useCallback((eventId) => map[eventId] || null, [map])

  return { map, setReminder, clearReminder, getReminder }
}

/** Processa lembretes no servidor; fallback local só se marcado local: */
export function useReminderTicker(t) {
  const { map, clearReminder } = useReminders()

  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      try {
        await processDueReminders()
      } catch {
        /* ignore */
      }

      if (cancelled) return

      const now = Date.now()
      for (const [id, raw] of Object.entries(map)) {
        const localOnly = String(raw).startsWith('local:')
        const parsedLocal = localOnly ? parseLocalReminderValue(raw) : null
        const iso = localOnly ? parsedLocal.whenIso : String(raw)
        const ts = new Date(iso).getTime()
        if (Number.isNaN(ts)) {
          clearReminder(id)
          continue
        }

        // Servidor: limpar UI só muito depois da hora (dá tempo ao worker enviar)
        if (!localOnly) {
          if (ts <= now - 60 * 60 * 1000) clearReminder(id)
          continue
        }

        if (ts > now) continue
        const dia = parsedLocal?.dia
        const url = dia
          ? `/?dia=${encodeURIComponent(dia)}&evento=${encodeURIComponent(id)}`
          : `/?evento=${encodeURIComponent(id)}`
        let shown = false
        try {
          if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
            const reg = await getPushServiceWorker(2000)
            if (!reg) continue
            await reg.showNotification(t.reminders?.title || 'Lembrete', {
              body: t.reminders?.body || 'Um evento das festas está prestes a começar.',
              icon: '/icon-192.png',
              tag: `fbv-local-${id}`,
              data: { url },
            })
            shown = true
          }
        } catch {
          /* ignore — manter lembrete para retry */
        }
        if (shown) clearReminder(id)
      }
    }

    tick()
    const id = window.setInterval(tick, 60000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [map, clearReminder, t])
}

export function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  )
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}
