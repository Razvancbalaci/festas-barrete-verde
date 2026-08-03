import { FESTIVAL_DAYS } from '../data/days'

/** Bloco base com pulse + shimmer */
export function Bone({ className = '' }) {
  return (
    <div
      className={`skeleton-bone relative overflow-hidden rounded-md bg-ink/10 animate-pulse ${className}`}
      aria-hidden
    />
  )
}

export function HeaderSkeleton() {
  return (
    <header
      className="relative overflow-hidden border-b border-barrete/10"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            'linear-gradient(135deg, #1B5E3F 0%, #2E7D53 45%, #1B5E3F 100%)',
        }}
      />
      <div className="relative mx-auto max-w-3xl px-4 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-4">
        <div className="mb-3 flex items-center justify-end gap-2">
          <Bone className="h-8 w-14 rounded-full !bg-white/20" />
          <Bone className="h-8 w-16 rounded-full !bg-white/20" />
        </div>
        <div className="flex flex-col items-center">
          <Bone className="mb-2 h-12 w-12 rounded-xl !bg-white/25 sm:h-14 sm:w-14" />
          <Bone className="h-6 w-64 max-w-[85%] rounded-lg !bg-white/25 sm:h-7 sm:w-80" />
          <Bone className="mt-2 h-3.5 w-48 max-w-[70%] rounded !bg-white/20" />
          <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-dourado/50" />
        </div>
      </div>
    </header>
  )
}

export function DayTabsSkeleton() {
  return (
    <div
      className="sticky top-0 z-20 border-b border-barrete/10 bg-creme/95 backdrop-blur-md"
      aria-hidden
    >
      <div className="mx-auto flex max-w-3xl items-stretch gap-2 px-3 py-3 sm:px-6">
        <div className="hide-scrollbar min-w-0 flex-1 overflow-x-auto pb-1">
          <div className="flex gap-2">
            {FESTIVAL_DAYS.map((day) => (
              <div
                key={day.date}
                className="flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl bg-white px-3 py-2.5 shadow-sm"
              >
                <Bone className="h-2.5 w-8" />
                <Bone className="h-5 w-6" />
              </div>
            ))}
          </div>
        </div>
        <Bone className="h-[3.75rem] w-14 shrink-0 rounded-2xl sm:w-16" />
        <Bone className="h-[3.75rem] w-14 shrink-0 rounded-2xl sm:w-16" />
      </div>
    </div>
  )
}

export function FilterBarSkeleton() {
  return (
    <div className="border-b border-barrete/10 bg-creme/80" aria-hidden>
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5 sm:px-6">
        <Bone className="h-11 min-w-0 flex-1 rounded-xl" />
        <Bone className="h-11 w-[5.5rem] shrink-0 rounded-xl" />
      </div>
    </div>
  )
}

export function EventCardSkeleton() {
  return (
    <article
      className="overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-barrete/5"
      aria-hidden
    >
      <div className="flex gap-3">
        <Bone className="h-14 w-14 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2.5 pt-0.5">
          <div className="flex items-start justify-between gap-2">
            <Bone className="h-4 w-[70%] max-w-xs" />
            <Bone className="h-5 w-16 shrink-0 rounded-full" />
          </div>
          <Bone className="h-3.5 w-[45%]" />
          <div className="flex flex-wrap gap-2 pt-1">
            <Bone className="h-7 w-28 rounded-full" />
            <Bone className="h-7 w-20 rounded-full" />
            <Bone className="h-7 w-32 rounded-full" />
          </div>
        </div>
      </div>
    </article>
  )
}

export function EventListSkeleton({ count = 3 }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Bone className="mb-1 h-6 w-40 rounded-lg" />
      {Array.from({ length: count }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Shell completo do 1.º paint (antes dos eventos). */
export function ProgramPageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col" aria-busy="true">
      <HeaderSkeleton />
      <DayTabsSkeleton />
      <FilterBarSkeleton />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 sm:px-6 sm:py-5">
        <EventListSkeleton />
      </main>
    </div>
  )
}
