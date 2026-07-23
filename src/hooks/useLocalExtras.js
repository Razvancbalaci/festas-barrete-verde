import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { processDueReminders } from '../lib/reminders'

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
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id]
    writeJson(FAV_KEY, next)
    emit(favListeners)
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
        const iso = localOnly ? String(raw).slice(6) : String(raw)
        const ts = new Date(iso).getTime()
        if (Number.isNaN(ts)) {
          clearReminder(id)
          continue
        }

        // Servidor: limpar UI um pouco depois da hora (o push já foi / vai ser enviado)
        if (!localOnly) {
          if (ts <= now - 2 * 60 * 1000) clearReminder(id)
          continue
        }

        if (ts > now) continue
        try {
          if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready
            await reg.showNotification(t.reminders?.title || 'Lembrete', {
              body: t.reminders?.body || 'Um evento das festas está prestes a começar.',
              icon: '/icon-192.png',
              tag: `fbv-local-${id}`,
              data: { url: `/?evento=${id}` },
            })
          }
        } catch {
          /* ignore */
        }
        clearReminder(id)
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

/** Combina dia + hora do evento num Date local. */
export function eventDateTime(dia, hora) {
  const [hh, mm] = String(hora).split(':').map((n) => parseInt(n, 10))
  const d = new Date(`${dia}T00:00:00`)
  d.setHours(hh || 0, mm || 0, 0, 0)
  return d
}
