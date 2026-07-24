import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, BellRing, X } from 'lucide-react'
import { useLang } from '../context/LangContext'
import { savePushSubscription } from '../lib/reminders'
import { track } from '../lib/analytics'
import { pushSupported, isAndroid, isInAppBrowser, getPushServiceWorker, getOrCreatePushSubscription } from '../lib/push'

const DISMISS_KEY = 'fbv-notify-dismissed'
const INSTALL_KEY = 'fbv-install-dismissed'
const SHOW_DELAY_MS = 7000

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

export default function NotifyPrompt() {
  const { t } = useLang()
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)
  const [lift, setLift] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | on | denied | unsupported | error | iosInstall | androidInstall | androidBrowser
  const [errorDetail, setErrorDetail] = useState('')
  const n = t.notify

  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    if (!pushSupported()) return

    const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapid) return

    if (Notification.permission === 'denied') return

    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return
    } catch {
      /* ignore */
    }

    let cancelled = false

    const syncLift = () => {
      try {
        setLift(localStorage.getItem(INSTALL_KEY) !== '1')
      } catch {
        setLift(false)
      }
    }
    syncLift()
    const liftTimer = window.setInterval(syncLift, 800)

    async function ensureSavedIfGranted() {
      if (Notification.permission !== 'granted') return false
      // iOS e Android: avisos só depois de instalada / aberta pelo ícone
      if ((isIos() || isAndroid()) && !isStandalone()) return false
      if (isInAppBrowser()) return false
      try {
        const reg = await getPushServiceWorker()
        if (!reg) return false
        const created = await getOrCreatePushSubscription(reg, vapid)
        if (!created.ok) return false
        const saved = await savePushSubscription(created.subscription.toJSON())
        return saved.ok
      } catch {
        return false
      }
    }

    const timer = window.setTimeout(async () => {
      if (cancelled) return
      if (Notification.permission === 'granted') {
        const ok = await ensureSavedIfGranted()
        if (!ok && !cancelled) setVisible(true)
        return
      }
      setVisible(true)
    }, SHOW_DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.clearInterval(liftTimer)
    }
  }, [pathname])

  const shownTracked = useRef(false)

  useEffect(() => {
    if (!visible || pathname.startsWith('/admin')) return
    if (shownTracked.current) return
    shownTracked.current = true
    track('push_prompt_show')
  }, [visible, pathname])

  if (!visible || pathname.startsWith('/admin')) return null

  const dismiss = (manual = true) => {
    setVisible(false)
    if (manual) track('push_prompt_dismiss')
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const enable = async () => {
    setStatus('loading')
    setErrorDetail('')
    try {
      if (!pushSupported()) {
        setStatus('unsupported')
        return
      }

      if (isIos() && !isStandalone()) {
        setStatus('iosInstall')
        return
      }

      if (isAndroid() && !isStandalone()) {
        setStatus('androidInstall')
        return
      }

      if (isInAppBrowser()) {
        setStatus('androidBrowser')
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return
      }

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setStatus('error')
        setErrorDetail('VAPID')
        return
      }

      const reg = await getPushServiceWorker()
      if (!reg) {
        setStatus('error')
        setErrorDetail(n.errorSw || 'service worker')
        return
      }

      const created = await getOrCreatePushSubscription(reg, vapidKey, {
        recreate: isAndroid(),
      })
      if (!created.ok) {
        setStatus('error')
        setErrorDetail(
          created.reason === 'timeout'
            ? n.errorTimeout || 'timeout'
            : created.error?.message || created.reason || 'subscribe'
        )
        return
      }

      const json = created.subscription.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('Subscription keys missing')
      }

      const saved = await savePushSubscription(json)
      if (!saved.ok) {
        console.error('push_subscriptions save:', saved.error)
        setStatus('error')
        setErrorDetail(saved.error?.message || saved.error?.code || 'db')
        return
      }

      // Teste local imediato (confirma permissão + SW no Android)
      try {
        await reg.showNotification(n.testTitle || 'Festas Alcochete', {
          body: n.testBody || 'Notificações activas neste telemóvel.',
          icon: '/icon-192.png',
          tag: 'fbv-push-test',
        })
      } catch {
        /* ignore — push remota pode mesmo assim funcionar */
      }

      setStatus('on')
      track('push_prompt_enable')
      window.setTimeout(() => dismiss(false), 1800)
    } catch (err) {
      console.error(err)
      setStatus('error')
      setErrorDetail(err?.message || String(err))
    }
  }

  const bodyText =
    status === 'denied'
      ? n.denied
      : status === 'unsupported'
        ? n.unsupported
        : status === 'iosInstall'
          ? n.iosInstall
          : status === 'androidInstall'
            ? n.androidInstall
            : status === 'androidBrowser'
              ? n.androidBrowser
              : status === 'error'
                ? n.error
                : status === 'on'
                  ? null
                  : n.body

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
          {bodyText ? (
            <p className="mt-1 text-xs leading-relaxed text-white/75">{bodyText}</p>
          ) : null}
          {status === 'error' && errorDetail ? (
            <p className="mt-1 break-all text-[0.65rem] text-white/45">{errorDetail}</p>
          ) : null}

          {status !== 'on' &&
            status !== 'denied' &&
            status !== 'unsupported' &&
            status !== 'iosInstall' &&
            status !== 'androidInstall' &&
            status !== 'androidBrowser' && (
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
