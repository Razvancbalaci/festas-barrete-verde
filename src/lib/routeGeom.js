/** Geometria de rotas [lat, lng] para animação no mapa. */

function toRad(d) {
  return (d * Math.PI) / 180
}

/** Distância aproximada em metros (haversine). */
export function haversineMeters(a, b) {
  const R = 6371000
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Comprimentos cumulativos (m) ao longo da polyline. */
export function routeCumulativeMeters(latlngs) {
  const cum = [0]
  for (let i = 1; i < latlngs.length; i++) {
    cum.push(cum[i - 1] + haversineMeters(latlngs[i - 1], latlngs[i]))
  }
  return cum
}

/**
 * Ponto a uma fracção t ∈ [0, 1] ao longo da rota.
 * @returns {[number, number]}
 */
export function pointAlongRoute(latlngs, t) {
  if (!latlngs?.length) return [0, 0]
  if (latlngs.length === 1) return latlngs[0]
  const cum = routeCumulativeMeters(latlngs)
  const total = cum[cum.length - 1]
  if (total <= 0) return latlngs[0]
  const target = Math.min(1, Math.max(0, t)) * total
  let i = 1
  while (i < cum.length && cum[i] < target) i += 1
  const a = latlngs[i - 1]
  const b = latlngs[i] || latlngs[latlngs.length - 1]
  const segStart = cum[i - 1]
  const segLen = (cum[i] ?? segStart) - segStart
  const u = segLen > 0 ? (target - segStart) / segLen : 0
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]
}

/** Ida-e-volta: 0→1→0→1… a partir de progresso linear 0–1. */
export function pingPong(t, cycles = 3) {
  const x = Math.min(1, Math.max(0, t)) * cycles
  const phase = x % 2
  return phase <= 1 ? phase : 2 - phase
}

/**
 * Ida-e-volta contínua no tempo (visível): um ciclo 0→1→0 a cada `periodMs`.
 * `phase01` desfasamento 0–1 entre vários toiros.
 */
export function oscillateProgress(elapsedMs, periodMs = 16000, phase01 = 0) {
  const period = Math.max(1000, periodMs)
  const shifted = elapsedMs + phase01 * period
  const x = ((shifted % period) + period) % period / period // 0–1
  // triângulo: 0→1 na 1.ª metade, 1→0 na 2.ª
  return x < 0.5 ? x * 2 : (1 - x) * 2
}

/**
 * Percurso ida-e-volta a partir do polígono GPS do recinto:
 * eixo mais longo do anel (arco mais curto entre os dois vértices mais afastados).
 */
export function routeFromPolygonRing(positions) {
  if (!positions?.length) return []
  if (positions.length === 1) return [positions[0]]
  if (positions.length === 2) return [positions[0], positions[1]]

  // Remover vértice de fecho duplicado, se existir
  let ring = positions
  const first = positions[0]
  const last = positions[positions.length - 1]
  if (
    Math.abs(first[0] - last[0]) < 1e-9 &&
    Math.abs(first[1] - last[1]) < 1e-9
  ) {
    ring = positions.slice(0, -1)
  }
  const n = ring.length
  if (n < 2) return ring

  let bestI = 0
  let bestJ = 1
  let bestD = -1
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversineMeters(ring[i], ring[j])
      if (d > bestD) {
        bestD = d
        bestI = i
        bestJ = j
      }
    }
  }

  const arcLen = (from, to, dir) => {
    let len = 0
    let k = from
    while (k !== to) {
      const next = (k + dir + n) % n
      len += haversineMeters(ring[k], ring[next])
      k = next
    }
    return len
  }

  const arcPoints = (from, to, dir) => {
    const pts = [ring[from]]
    let k = from
    while (k !== to) {
      k = (k + dir + n) % n
      pts.push(ring[k])
    }
    return pts
  }

  const forwardLen = arcLen(bestI, bestJ, 1)
  const backwardLen = arcLen(bestI, bestJ, -1)
  return forwardLen <= backwardLen
    ? arcPoints(bestI, bestJ, 1)
    : arcPoints(bestI, bestJ, -1)
}
