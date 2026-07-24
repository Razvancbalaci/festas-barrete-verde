import { useEffect } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'

/**
 * Modal de confirmação antes de enviar / agendar / pausar push.
 * props.draft: { mode, title?, body?, whenLabel?, subscribers?, autoCount?, deviceCount? }
 */
export default function NotifyConfirmModal({
  open,
  draft,
  busy,
  onConfirm,
  onCancel,
  t,
}) {
  const a = t

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open || !draft) return null

  const isDevices =
    draft.mode === 'deactivate_all' || draft.mode === 'reactivate_all'

  const modeLabel =
    draft.mode === 'now'
      ? a.notifyConfirmModeNow
      : draft.mode === 'schedule'
        ? a.notifyConfirmModeSchedule
        : draft.mode === 'test5'
          ? a.notifyConfirmModeTest
          : draft.mode === 'deactivate_all'
            ? a.notifyConfirmModeDeactivate
            : draft.mode === 'reactivate_all'
              ? a.notifyConfirmModeReactivate
              : a.notifyConfirmModeAuto

  const hint =
    draft.mode === 'deactivate_all'
      ? a.notifyConfirmDeactivateHint
      : draft.mode === 'reactivate_all'
        ? a.notifyConfirmReactivateHint
        : a.notifyConfirmHint

  const actionLabel =
    draft.mode === 'deactivate_all'
      ? a.notifyDeactivateConfirm
      : draft.mode === 'reactivate_all'
        ? a.notifyReactivateConfirm
        : a.notifyConfirmAction

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notify-confirm-title"
      onClick={() => {
        if (!busy) onCancel()
      }}
    >
      <div
        className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-creme p-5 shadow-xl animate-fade-up sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vermelho/10">
              <AlertTriangle className="h-5 w-5 text-vermelho" aria-hidden />
            </div>
            <div>
              <h2
                id="notify-confirm-title"
                className="font-display text-lg font-semibold text-barrete"
              >
                {isDevices ? a.notifyDevicesTitle : a.notifyConfirmTitle}
              </h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-vermelho/80">
                {modeLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg p-1.5 text-ink/50 hover:bg-ink/5 hover:text-ink disabled:opacity-40"
            aria-label={a.cancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-ink/65">{hint}</p>

        {draft.mode === 'auto' ? (
          <div className="rounded-xl bg-white p-4 ring-1 ring-barrete/10">
            <p className="text-sm text-ink/70">{a.notifyConfirmAutoIntro}</p>
            <p className="mt-2 font-display text-2xl font-bold text-barrete">
              {draft.autoCount ?? 0}
            </p>
            <p className="text-xs text-ink/50">{a.notifyConfirmAutoJobs}</p>
          </div>
        ) : isDevices ? (
          <div className="rounded-xl bg-white p-4 ring-1 ring-barrete/10">
            <p className="text-sm text-ink/70">
              {draft.mode === 'deactivate_all'
                ? a.notifyConfirmDeactivateCount
                : a.notifyConfirmReactivateCount}
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-barrete">
              {draft.deviceCount ?? 0}
            </p>
            <p className="text-xs text-ink/50">{a.notifyConfirmDevices}</p>
          </div>
        ) : (
          <dl className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-barrete/10">
            <div>
              <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink/45">
                {a.notifyConfirmWhen}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink">{draft.whenLabel}</dd>
            </div>
            <div>
              <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink/45">
                {a.notifySubject}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink">{draft.title}</dd>
            </div>
            <div>
              <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink/45">
                {a.notifyBody}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-ink/80">{draft.body}</dd>
            </div>
            {typeof draft.subscribers === 'number' ? (
              <div>
                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink/45">
                  {a.notifyConfirmAudience}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-barrete">
                  {a.notifyConfirmSubscribers.replace(
                    '{n}',
                    String(draft.subscribers)
                  )}
                </dd>
              </div>
            ) : null}
          </dl>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-ink/5 px-4 py-2.5 text-sm font-semibold text-ink/70 hover:bg-ink/10 disabled:opacity-50 sm:flex-none"
          >
            {a.cancel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-vermelho px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-60 sm:flex-none"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {a.notifySending}
              </>
            ) : (
              actionLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
