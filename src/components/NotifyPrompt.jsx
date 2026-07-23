import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, BellRing, X } from 'lucide-react'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import { pushSupported, urlBase64ToUint8Array } from '../lib/push'

const DISMISS_KEY = 'fbv-notify-dismissed'
const INSTALL_KEY = 'fbv-install-dismissed'
const SHOW_DELAY_MS = 7000

export default function NotifyPrompt() {
  const { t } = useLang()
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)
  const [lift, setLift] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | on | denied | unsupported | error
  const n = t.notify

  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    if (!pushSupported()) return

    const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapid) return

    if (Notification.permission === 'granted') return
    if (Notification.permission === 'denied') return

    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return
    } catch {
      /* ignore */
    }

    const syncLift = () => {
      try {
        setLift(localStorage.getItem(INSTALL_KEY) !== '1')
      } catch {
        setLift(false)
      }
    }
    syncLift()
    const liftTimer = window.setInterval(syncLift, 800)

    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(liftTimer)
    }
  }, [pathname])

  if (!visible || pathname.startsWith('/admin')) return null

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const enable = async () => {
    setStatus('loading')
    try {
      if (!pushSupported()) {
        setStatus('unsupported')
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return
      }

      const reg = await navigator.serviceWorker.ready
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setStatus('error')
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const json = sub.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: 'endpoint' }
      )

      if (error) throw error

      setStatus('on')
      window.setTimeout(dismiss, 1800)
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-x-0 z-40 p-3 sm:p-4"
      style={{
        bottom: lift ? '5.75rem' : 0,
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
      }}
      role="dialog"
      aria-labelledby="notify-title"
    >
      <div className="mx-auto flex max-w-3xl animate-fade-up items-start gap-3 rounded-2xl bg-ink px-4 py-3.5 text-white shadow-lg ring-1 ring-white/10 sm:px-5">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
          {status === 'on' ? (
            <BellRing className="h-5 w-5 text-dourado" aria-hidden />
          ) : (
            <Bell className="h-5 w-5 text-dourado" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p id="notify-title" className="text-sm font-semibold leading-snug">
            {status === 'on' ? n.enabled : n.title}
          </p>
          {status === 'denied' ? (
            <p className="mt-1 text-xs text-white/75">{n.denied}</p>
          ) : status === 'unsupported' ? (
            <p className="mt-1 text-xs text-white/75">{n.unsupported}</p>
          ) : status === 'error' ? (
            <p className="mt-1 text-xs text-white/75">{n.error}</p>
          ) : status === 'on' ? null : (
            <p className="mt-1 text-xs leading-relaxed text-white/75">{n.body}</p>
          )}

          {status !== 'on' && status !== 'denied' && status !== 'unsupported' && (
            <button
              type="button"
              onClick={enable}
              disabled={status === 'loading'}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-dourado px-3.5 py-2 text-xs font-bold text-ink transition hover:brightness-105 disabled:opacity-60"
            >
              <Bell className="h-3.5 w-3.5" aria-hidden />
              {status === 'loading' ? '…' : n.enable}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label={n.dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
