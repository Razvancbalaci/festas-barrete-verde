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
  const x = (((shifted % period) + period) % period) / period // 0–1
  // triângulo: 0→1 na 1.ª metade, 1→0 na 2.ª
  return x < 0.5 ? x * 2 : (1 - x) * 2
}

/** Anel aberto (sem vértice de fecho duplicado). */
export function openPolygonRing(positions) {
  if (!positions?.length) return []
  if (positions.length === 1) return [positions[0]]
  const first = positions[0]
  const last = positions[positions.length - 1]
  if (
    Math.abs(first[0] - last[0]) < 1e-9 &&
    Math.abs(first[1] - last[1]) < 1e-9
  ) {
    return positions.slice(0, -1)
  }
  return positions
}

/** Ray-casting: ponto [lat,lng] dentro do polígono? */
export function pointInPolygon(point, positions) {
  const ring = openPolygonRing(positions)
  if (ring.length < 3) return false
  const [y, x] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i][0]
    const xi = ring[i][1]
    const yj = ring[j][0]
    const xj = ring[j][1]
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function polygonCentroid(ring) {
  let lat = 0
  let lng = 0
  for (const p of ring) {
    lat += p[0]
    lng += p[1]
  }
  const n = ring.length || 1
  return [lat / n, lng / n]
}

/** Encolhe o anel em direcção ao centróide (fica no interior). */
export function shrinkPolygon(positions, factor = 0.62) {
  const ring = openPolygonRing(positions)
  if (ring.length < 3) return ring
  const f = Math.min(0.95, Math.max(0.15, factor))
  const [cx, cy] = polygonCentroid(ring)
  return ring.map(([la, ln]) => [cx + (la - cx) * f, cy + (ln - cy) * f])
}

/**
 * Eixo central do recinto: em cada metro do comprimento, o meio da largura.
 * Ida-e-volta — cobre ruas irregulares (ex. Quebrada) de ponta a ponta.
 */
function buildTourPath(ring) {
  const [cx, cy] = polygonCentroid(ring)
  const mPerDegLat = 111_320
  const mPerDegLng = 111_320 * Math.cos((cx * Math.PI) / 180)

  const toLocal = ([lat, lng]) => [
    (lat - cx) * mPerDegLat,
    (lng - cy) * mPerDegLng,
  ]
  const fromLocal = (n, e) => [cx + n / mPerDegLat, cy + e / mPerDegLng]

  // Direcção = vértices mais afastados (comprimento da rua)
  let bestI = 0
  let bestJ = 1
  let bestD = -1
  for (let i = 0; i < ring.length; i++) {
    for (let j = i + 1; j < ring.length; j++) {
      const d = haversineMeters(ring[i], ring[j])
      if (d > bestD) {
        bestD = d
        bestI = i
        bestJ = j
      }
    }
  }
  const [aN, aE] = toLocal(ring[bestI])
  const [bN, bE] = toLocal(ring[bestJ])
  let uN = bN - aN
  let uE = bE - aE
  const mag = Math.hypot(uN, uE) || 1
  uN /= mag
  uE /= mag
  const pN = -uE
  const pE = uN

  let minT = Infinity
  let maxT = -Infinity
  for (const v of ring) {
    const [n, e] = toLocal(v)
    const t = n * uN + e * uE
    if (t < minT) minT = t
    if (t > maxT) maxT = t
  }

  const path = []
  const margin = Math.min(2, Math.max(0.5, (maxT - minT) * 0.02))
  for (let t = minT + margin; t <= maxT - margin + 1e-6; t += 1) {
    let bestLo = null
    let bestHi = null
    let bestLen = -1
    let runLo = null
    let runHi = null
    for (let s = -80; s <= 80; s += 0.5) {
      const pt = fromLocal(t * uN + s * pN, t * uE + s * pE)
      if (pointInPolygon(pt, ring)) {
        if (runLo == null) runLo = s
        runHi = s
      } else if (runLo != null) {
        const len = runHi - runLo
        if (len > bestLen) {
          bestLo = runLo
          bestHi = runHi
          bestLen = len
        }
        runLo = null
        runHi = null
      }
    }
    if (runLo != null) {
      const len = runHi - runLo
      if (len > bestLen) {
        bestLo = runLo
        bestHi = runHi
        bestLen = len
      }
    }
    if (bestLo == null || bestLen < 0.4) continue
    const mid = (bestLo + bestHi) / 2
    path.push(fromLocal(t * uN + mid * pN, t * uE + mid * pE))
  }

  if (path.length < 2) {
    const fallback = [
      fromLocal((minT + margin) * uN, (minT + margin) * uE),
      fromLocal((maxT - margin) * uN, (maxT - margin) * uE),
    ]
    return { path: fallback, mode: 'shuttle', ring, cx, cy }
  }
  return { path, mode: 'shuttle', ring, cx, cy }
}

const wanderPathCache = new WeakMap()

function wanderPathsFor(positions) {
  let cached = wanderPathCache.get(positions)
  if (cached) return cached
  const ring = openPolygonRing(positions)
  cached = buildTourPath(ring)
  if (typeof positions === 'object' && positions) {
    wanderPathCache.set(positions, cached)
  }
  return cached
}

/**
 * Percorre a reta central do recinto (ida-e-volta) a velocidade constante.
 */
export function wanderInPolygon(
  positions,
  elapsedMs,
  periodMs = 10000,
  phase01 = 0,
) {
  const ring0 = openPolygonRing(positions)
  if (!ring0.length) return [0, 0]
  if (ring0.length === 1) return ring0[0]
  if (ring0.length === 2) {
    const t = oscillateProgress(elapsedMs, periodMs, phase01)
    return pointAlongRoute(ring0, t)
  }

  const { path, mode, ring } = wanderPathsFor(positions)
  const period = Math.max(8000, periodMs)
  const t =
    mode === 'loop'
      ? (((elapsedMs / period + phase01) % 1) + 1) % 1
      : oscillateProgress(elapsedMs, period, phase01)
  const p = pointAlongRoute(path, t)
  if (!ring || pointInPolygon(p, ring)) return p
  let best = path[0]
  let bestD = Infinity
  for (let i = 0; i < path.length; i++) {
    const d = haversineMeters(p, path[i])
    if (d < bestD) {
      bestD = d
      best = path[i]
    }
  }
  return best
}

/**
 * Percurso ida-e-volta a partir do polígono GPS do recinto:
 * eixo mais longo do anel (arco mais curto entre os dois vértices mais afastados).
 */
export function routeFromPolygonRing(positions) {
  if (!positions?.length) return []
  if (positions.length === 1) return [positions[0]]
  if (positions.length === 2) return [positions[0], positions[1]]

  const ring = openPolygonRing(positions)
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
