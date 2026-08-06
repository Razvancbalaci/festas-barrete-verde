import { beforeEach, describe, expect, it } from 'vitest'
import {
  dismissMapPinTapTip,
  isMapPinTapTipDismissed,
  MAP_PIN_TAP_TIP_KEY,
} from './mapPinTapTip'

describe('mapPinTapTip', () => {
  beforeEach(() => {
    localStorage.removeItem(MAP_PIN_TAP_TIP_KEY)
  })

  it('starts visible', () => {
    expect(isMapPinTapTipDismissed()).toBe(false)
  })

  it('remembers dismiss', () => {
    dismissMapPinTapTip()
    expect(isMapPinTapTipDismissed()).toBe(true)
    expect(localStorage.getItem(MAP_PIN_TAP_TIP_KEY)).toBe('1')
  })
})
