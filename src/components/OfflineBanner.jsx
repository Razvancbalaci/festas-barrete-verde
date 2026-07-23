import { WifiOff } from 'lucide-react'
import { useLang } from '../context/LangContext'
import { useOnline } from '../hooks/useLocalExtras'

export default function OfflineBanner() {
  const online = useOnline()
  const { t } = useLang()
  if (online) return null

  return (
    <div
      className="bg-ink px-4 py-2 text-center text-xs font-medium text-white"
      role="status"
    >
      <span className="inline-flex items-center gap-1.5">
        <WifiOff className="h-3.5 w-3.5 text-dourado" aria-hidden />
        {t.offlineBanner}
      </span>
    </div>
  )
}
