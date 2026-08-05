import { useEffect, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { useLang } from '../context/LangContext'
import { isInAppBrowser } from '../lib/push'

const DISMISS_KEY = 'fbv-inapp-dismissed'

function wasDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function markDismissed() {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1')
  } catch {
    /* ignore */
  }
}

/**
 * Aviso quando a app abre dentro do Instagram/Facebook/etc.
 * Push e «Adicionar ao ecrã» costumam falhar nesses WebViews.
 */
export default function InAppBrowserBanner() {
  const { t } = useLang()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isInAppBrowser() || wasDismissed()) return
    setVisible(true)
  }, [])

  if (!visible) return null

  const copy = t.inAppBrowser || {}

  const dismiss = () => {
    markDismissed()
    setVisible(false)
  }

  return (
    <div
      className="relative z-[60] border-b border-dourado/40 bg-dourado/25 px-3 py-2.5 text-ink sm:px-4"
      role="status"
    >
      <div className="mx-auto flex max-w-3xl items-start gap-2">
        <ExternalLink
          className="mt-0.5 h-4 w-4 shrink-0 text-ink/70"
          aria-hidden
        />
        <p className="min-w-0 flex-1 text-xs leading-snug sm:text-sm">
          {copy.body ||
            'Estás dentro de outra app (Instagram, Facebook…). Abre no Chrome ou Safari para instalar e receber avisos.'}
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-ink/50 transition hover:bg-ink/5 hover:text-ink"
          aria-label={copy.dismiss || 'Fechar'}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
