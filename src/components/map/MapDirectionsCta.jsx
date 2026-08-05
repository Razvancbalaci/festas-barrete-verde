import { Navigation } from 'lucide-react'

/**
 * CTA «Ir a pé» / «Conduzir» nos popups do mapa.
 * Estilo outline (creme + barrete) — evita links azuis do Leaflet em fundo verde.
 */
export default function MapDirectionsCta({
  href,
  label,
  variant = 'walk',
  onClick,
}) {
  const isDrive = variant === 'drive'
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`fbv-map-directions-cta inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold shadow-sm transition ${
        isDrive
          ? 'bg-white text-ink ring-1 ring-ink/15 hover:bg-ink/[0.04]'
          : 'bg-white text-barrete ring-1 ring-barrete/25 hover:bg-barrete/[0.06]'
      }`}
    >
      <Navigation className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </a>
  )
}
