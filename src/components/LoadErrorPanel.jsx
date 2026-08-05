import { RefreshCw } from 'lucide-react'

/** Painel de erro de rede / retry (programa e comércio). */
export default function LoadErrorPanel({
  title,
  cachedHint,
  retryLabel,
  onRetry,
  retrying = false,
}) {
  return (
    <div
      className="animate-fade-in rounded-2xl bg-white px-5 py-8 text-center shadow-sm ring-1 ring-vermelho/20"
      role="alert"
    >
      <p className="text-sm font-semibold text-ink">{title}</p>
      {cachedHint ? (
        <p className="mt-2 text-xs leading-relaxed text-ink/55">{cachedHint}</p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-barrete px-4 py-2 text-sm font-semibold text-white transition hover:bg-barrete-light disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`}
            aria-hidden
          />
          {retryLabel || 'Tentar de novo'}
        </button>
      ) : null}
    </div>
  )
}
