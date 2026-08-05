/**
 * ============================================================
 * TEMPORÁRIO — smoke test «tudo a decorrer agora»
 * Remover depois de testar:
 *   - este ficheiro
 *   - src/components/LiveSmokeBanner.jsx
 *   - imports/usos de isLiveSmokeTest / liveSmokeEvents / LiveSmokeBanner
 * Activar: ligar no back-office (Mapa → Ferramentas de teste) e usar o botão «Testar live»
 *          ou localStorage fbv-live-test=1 (só com a flag ligada no servidor)
 * Desactivar: «Desligar» na barra vermelha ou desligar no back-office
 * ============================================================
 */

import { localDateIso } from './datetime'
import { ENTRADA_ROUTE_LOCAL } from '../data/mapPlaces'
import { isLiveSmokeGateEnabled } from './appConfig'

const STORAGE_KEY = 'fbv-live-test'

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** HH:MM a partir de um Date (relógio real). */
function clockHora(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function isLiveSmokeTest() {
  if (!isLiveSmokeGateEnabled()) return false
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Persistência opcional (o banner «Manter ligado» usa isto). */
export function setLiveSmokeTest(on) {
  try {
    if (on) window.localStorage.setItem(STORAGE_KEY, '1')
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Eventos sintéticos alinhados com o relógio actual (dia civil de hoje).
 * Prefixados com [TEST] para serem óbvios.
 */
export function liveSmokeEvents(now = new Date()) {
  const dia = localDateIso(now)
  const ago = (mins) => clockHora(new Date(now.getTime() - mins * 60_000))
  const ahead = (mins) => clockHora(new Date(now.getTime() + mins * 60_000))

  return [
    {
      id: 'live-test-happening',
      dia,
      hora: ago(20),
      titulo: '[TEST] Concerto a decorrer',
      categoria: 'Música',
      local: 'Palco Salineiro',
      descricao: 'Evento sintético para o banner «A decorrer no mapa / agora».',
    },
    {
      id: 'live-test-next',
      dia,
      hora: ahead(35),
      titulo: '[TEST] Próximo no programa',
      categoria: 'Institucional',
      local: 'Largo da República',
      descricao: 'Só aparece no banner se não houver nada a decorrer.',
    },
    {
      id: 'live-test-entrada',
      dia,
      hora: ago(8),
      titulo: '[TEST] Entrada de toiros',
      categoria: 'Toiros',
      local: ENTRADA_ROUTE_LOCAL,
      descricao: 'Activa toiro animado no percurso das entradas no /mapa.',
    },
    {
      id: 'live-test-largada-quebrada',
      dia,
      hora: ago(8),
      titulo: '[TEST] Largada de toiros',
      categoria: 'Toiros',
      local: 'Rua da Quebrada, Rua José André dos Santos',
      descricao: 'Toiro a vaguear no recinto da Quebrada.',
    },
    {
      id: 'live-test-largada-5outubro',
      dia,
      hora: ago(8),
      titulo: '[TEST] Largada de toiros',
      categoria: 'Toiros',
      local: 'Av. 5 de Outubro',
      descricao: 'Toiro a vaguear no recinto da Av. 5 de Outubro.',
    },
    {
      id: 'live-test-corrida',
      dia,
      hora: ago(30),
      titulo: '[TEST] Corrida de toiros',
      categoria: 'Toiros',
      local: 'Praça de Touros',
      bilhetes_url: 'https://example.com/bilhetes',
      descricao: 'Corrida (não anima toiro de rua) — cartaz especial na lista.',
    },
  ]
}

/** Junta eventos reais + smoke (smoke primeiro; evita IDs duplicados). */
export function mergeLiveSmokeEvents(events, now = new Date()) {
  if (!isLiveSmokeTest()) return events || []
  const smoke = liveSmokeEvents(now)
  const ids = new Set(smoke.map((e) => e.id))
  return [...smoke, ...(events || []).filter((e) => !ids.has(e.id))]
}
