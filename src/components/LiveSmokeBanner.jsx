/**
 * TEMPORÁRIO — botão flutuante + barra do smoke test. Apagar com liveSmokeTest.js.
 */
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import {
  isLiveSmokeTest,
  setLiveSmokeTest,
} from '../lib/liveSmokeTest'
import { useLiveSmokeGate } from '../context/AppConfigContext'
import { requestInstallPrompt } from './InstallPrompt'

function reloadClean() {
  window.location.reload()
}

export default function LiveSmokeBanner() {
  const { pathname } = useLocation()
  const { ready, enabled: gateEnabled } = useLiveSmokeGate()
  const [on, setOn] = useState(() => isLiveSmokeTest())

  useEffect(() => {
    setOn(isLiveSmokeTest())
  }, [pathname, ready, gateEnabled])

  if (!ready || !gateEnabled || pathname.startsWith('/admin')) return null

  const enable = () => {
    setLiveSmokeTest(true)
    reloadClean()
  }

  const disable = () => {
    setLiveSmokeTest(false)
    reloadClean()
  }

  if (!on) {
    return (
      <button
        type="button"
        onClick={enable}
        className="fixed bottom-20 left-3 z-[60] inline-flex items-center gap-2 rounded-full bg-vermelho px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-vermelho/30 ring-2 ring-white/20 transition hover:brightness-110 sm:bottom-6 sm:left-4 sm:text-sm"
        title="Simular eventos a decorrer agora (temporário)"
      >
        <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
        Testar live
      </button>
    )
  }

  return (
    <div
      className="relative z-[70] border-b-2 border-vermelho bg-vermelho px-3 py-2 text-white"
      role="status"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-1.5 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:text-sm">
        <p className="font-bold leading-snug">
          MODO LIVE TEST — eventos [TEST] sintéticos. Remover depois.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/"
            className="rounded-lg bg-white/15 px-2.5 py-1 font-semibold hover:bg-white/25"
          >
            Programa
          </Link>
          <Link
            to="/mapa"
            className="rounded-lg bg-white/15 px-2.5 py-1 font-semibold hover:bg-white/25"
          >
            Mapa
          </Link>
          <Link
            to="/comercio"
            className="rounded-lg bg-white/15 px-2.5 py-1 font-semibold hover:bg-white/25"
          >
            Comércio
          </Link>
          <button
            type="button"
            onClick={() => requestInstallPrompt()}
            className="rounded-lg bg-dourado px-2.5 py-1 font-bold text-ink"
          >
            Testar Install
          </button>
          <button
            type="button"
            onClick={disable}
            className="rounded-lg bg-black/25 px-2.5 py-1 font-semibold hover:bg-black/40"
          >
            Desligar
          </button>
        </div>
      </div>
    </div>
  )
}
