import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useLang } from '../context/LangContext'

export const SW_UPDATE_EVENT = 'fbv-sw-update'

/**
 * Faixa quando há service worker novo (evita ficar preso numa versão antiga).
 */
export default function AppUpdateBanner() {
  const { t } = useLang()
  const [update, setUpdate] = useState(null)

  useEffect(() => {
    function onUpdate(e) {
      const fn = e?.detail?.update
      if (typeof fn === 'function') setUpdate(() => fn)
    }
    window.addEventListener(SW_UPDATE_EVENT, onUpdate)
    return () => window.removeEventListener(SW_UPDATE_EVENT, onUpdate)
  }, [])

  if (!update) return null

  const copy = t.appUpdate || {}

  return (
    <div
      className="relative z-[80] border-b border-dourado/40 bg-dourado px-3 py-2.5 text-ink sm:px-4"
      role="status"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 text-xs font-semibold leading-snug sm:text-sm">
          {copy.body || 'Há uma versão nova da app.'}
        </p>
        <button
          type="button"
          onClick={() => update()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-barrete px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          {copy.action || 'Atualizar'}
        </button>
      </div>
    </div>
  )
}
