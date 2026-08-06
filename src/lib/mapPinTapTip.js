/** 1ª visita no mapa: dica «toca nos pins». */
export const MAP_PIN_TAP_TIP_KEY = 'fbv-map-pin-tap-tip'

export function isMapPinTapTipDismissed() {
  try {
    return localStorage.getItem(MAP_PIN_TAP_TIP_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissMapPinTapTip() {
  try {
    localStorage.setItem(MAP_PIN_TAP_TIP_KEY, '1')
  } catch {
    /* ignore */
  }
}
