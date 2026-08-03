import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import { useLang } from '../context/LangContext'
import { track } from '../lib/analytics'
import { pushSupported } from '../lib/push'
import {
  INSTALL_SETTLED_EVENT,
  installBlocksNotify,
} from './InstallPrompt'
import NotifyPrefsForm from './NotifyPrefsForm'

const DISMISS_KEY = 'fbv-notify-dismissed'
/** Depois do install sair de cena (ou se não houver install). */
const AFTER_INSTALL_DELAY_MS = 1800

function waitForInstallSettled(signal) {
  if (!installBlocksNotify()) return Promise.resolve()
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const done = () => {
      cleanup()
      resolve()
    }
    const onSettled = () => done()
    const poll = window.setInterval(() => {
      if (!installBlocksNotify()) done()
    }, 400)
    const cleanup = () => {
      window.clearInterval(poll)
      window.removeEventListener(INSTALL_SETTLED_EVENT, onSettled)
      signal.removeEventListener('abort', onAbort)
    }
    const onAbort = () => done()
    window.addEventListener(INSTALL_SETTLED_EVENT, onSettled)
    signal.addEventListener('abort', onAbort)
  })
}

export default function NotifyPrompt() {
  const { t } = useLang()
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const n = t.notify

  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    if (!pushSupported()) return

    const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapid) return

    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      return
    }

    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return
    } catch {
      /* ignore */
    }

    // Já tem permissão → não insistir no banner (prefs ficam no rodapé)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      return
    }

    const ac = new AbortController()
    let cancelled = false

    ;(async () => {
      await waitForInstallSettled(ac.signal)
      if (cancelled || ac.signal.aborted) return
      await new Promise((r) => window.setTimeout(r, AFTER_INSTALL_DELAY_MS))
      if (cancelled || ac.signal.aborted) return
      setVisible(true)
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [pathname])

  const shownTracked = useRef(false)

  useEffect(() => {
    if (!visible || pathname.startsWith('/admin')) return
    if (shownTracked.current) return
    shownTracked.current = true
    track('push_prompt_show')
  }, [visible, pathname])

  if ((!visible && !prefsOpen) || pathname.startsWith('/admin')) return null

  const dismiss = (manual = true) => {
    setVisible(false)
    setPrefsOpen(false)
    if (manual) track('push_prompt_dismiss')
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const openPrefs = () => {
    setPrefsOpen(true)
  }

  return (
    <>
      {visible && !prefsOpen ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4"
          style={{
            paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
          }}
          role="dialog"
          aria-labelledby="notify-title"
        >
          <div className="mx-auto flex max-w-3xl animate-fade-up items-start gap-3 rounded-2xl bg-ink px-4 py-3.5 text-white shadow-lg ring-1 ring-white/10 sm:px-5">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Bell className="h-5 w-5 text-dourado" aria-hidden />
            </div>

            <div className="min-w-0 flex-1">
              <p id="notify-title" className="text-sm font-semibold leading-snug">
                {n.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/75">{n.body}</p>

              <button
                type="button"
                onClick={openPrefs}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-dourado px-3.5 py-2 text-xs font-bold text-ink transition hover:brightness-105"
              >
                <Bell className="h-3.5 w-3.5" aria-hidden />
                {n.enable}
              </button>
            </div>

            <button
              type="button"
              onClick={() => dismiss(true)}
              className="shrink-0 rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label={n.dismiss}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <NotifyPrefsForm
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        onEnabled={() => {
          track('push_prompt_enable')
          dismiss(false)
        }}
      />
    </>
  )
}
