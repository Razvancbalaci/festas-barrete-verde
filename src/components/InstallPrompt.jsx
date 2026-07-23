import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, Share, X } from 'lucide-react'
import { useLang } from '../context/LangContext'

const STORAGE_KEY = 'fbv-install-dismissed'
const SHOW_DELAY_MS = 2500

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isIos() {
  const ua = window.navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua)
  const iPadOS = ua.includes('Mac') && 'ontouchend' in document
  return iOS || iPadOS
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent || '')
}

function wasDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export default function InstallPrompt() {
  const { t } = useLang()
  const { pathname } = useLocation()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [iosMode, setIosMode] = useState(false)
  const [androidMode, setAndroidMode] = useState(false)
  const readyRef = useRef(false)

  useEffect(() => {
    if (pathname.startsWith('/admin') || isStandalone() || wasDismissed()) {
      setVisible(false)
      return
    }

    const ios = isIos()
    const android = isAndroid()
    setIosMode(ios)
    setAndroidMode(android)

    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (readyRef.current) setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    const timer = window.setTimeout(() => {
      readyRef.current = true
      // iOS e Android: mostrar sempre o ritual (no Android + botão Chrome se existir)
      if (ios || android) setVisible(true)
      setDeferredPrompt((current) => {
        if (current) setVisible(true)
        return current
      })
    }, SHOW_DELAY_MS)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.clearTimeout(timer)
      readyRef.current = false
    }
  }, [pathname])

  if (!visible || pathname.startsWith('/admin')) return null
  if (!iosMode && !androidMode && !deferredPrompt) return null

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    try {
      await deferredPrompt.userChoice
    } catch {
      /* ignore */
    }
    setDeferredPrompt(null)
    dismiss()
  }

  const copy = t.install

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
      role="dialog"
      aria-labelledby="install-title"
      aria-describedby="install-desc"
    >
      <div className="mx-auto flex max-w-3xl animate-fade-up items-start gap-3 rounded-2xl bg-barrete px-4 py-3.5 text-white shadow-lg shadow-barrete/25 ring-1 ring-white/10 sm:px-5">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
          {iosMode ? (
            <Share className="h-5 w-5 text-dourado" aria-hidden />
          ) : (
            <Download className="h-5 w-5 text-dourado" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p id="install-title" className="text-sm font-semibold leading-snug">
            {copy.title}
          </p>
          <p
            id="install-desc"
            className="mt-1 text-xs leading-relaxed text-white/80"
          >
            {iosMode ? (
              <>
                {copy.iosPrefix}{' '}
                <Share
                  className="inline h-3.5 w-3.5 align-text-bottom text-dourado"
                  aria-hidden
                />{' '}
                {copy.iosSuffix}
              </>
            ) : (
              copy.androidRitual
            )}
          </p>

          {/* Chrome: botão nativo Instalar, além do ritual ⋮ */}
          {!iosMode && deferredPrompt ? (
            <button
              type="button"
              onClick={install}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-dourado px-3.5 py-2 text-xs font-bold text-ink transition hover:brightness-105"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              {copy.cta}
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label={copy.dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
