import { useEffect, useRef, useState } from 'react'
import { CircleMarker, useMap } from 'react-leaflet'
import { LocateFixed, Loader2 } from 'lucide-react'
import { track } from '../../lib/analytics'

/**
 * Centra o mapa na posição GPS do telemóvel (só no dispositivo — não enviamos ao servidor).
 */
export default function LocateMeControl({ labels }) {
  const map = useMap()
  const [busy, setBusy] = useState(false)
  const [pos, setPos] = useState(null)
  const [message, setMessage] = useState(null)
  const watchRef = useRef(null)

  useEffect(() => {
    return () => {
      if (watchRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchRef.current)
      }
    }
  }, [])

  function locate() {
    if (!navigator.geolocation) {
      setMessage(labels?.locateUnsupported || 'Localização não disponível neste telemóvel.')
      return
    }
    setBusy(true)
    setMessage(null)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next = [p.coords.latitude, p.coords.longitude]
        setPos(next)
        map.flyTo(next, Math.max(map.getZoom(), 16), { duration: 0.8 })
        setBusy(false)
        track('map_locate')
      },
      (err) => {
        setBusy(false)
        if (err?.code === 1) {
          setMessage(
            labels?.locateDenied ||
              'Permissão de localização recusada. Podes activá-la nas definições do telemóvel.',
          )
        } else {
          setMessage(
            labels?.locateError ||
              'Não foi possível obter a tua posição. Tenta de novo ao ar livre.',
          )
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )
  }

  return (
    <>
      <div className="absolute bottom-3 left-3 z-[1000] flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={locate}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-barrete shadow-md ring-1 ring-barrete/10 backdrop-blur hover:bg-white disabled:opacity-60"
          aria-label={labels?.locateMe || 'Onde estou'}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <LocateFixed className="h-3.5 w-3.5" aria-hidden />
          )}
          {labels?.locateMe || 'Onde estou'}
        </button>
        {message ? (
          <p className="max-w-[14rem] rounded-lg bg-ink/85 px-2.5 py-1.5 text-[0.65rem] leading-snug text-white shadow">
            {message}
          </p>
        ) : null}
      </div>
      {pos ? (
        <CircleMarker
          center={pos}
          radius={9}
          pathOptions={{
            color: '#1B6CA8',
            weight: 3,
            fillColor: '#3B9BDB',
            fillOpacity: 0.85,
          }}
        />
      ) : null}
    </>
  )
}
