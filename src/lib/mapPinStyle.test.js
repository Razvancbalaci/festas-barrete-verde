import { describe, expect, it } from 'vitest'
import {
  MAP_PIN_KINDS,
  mapPinHtml,
  resolveMapPinStyle,
} from './mapPinStyle.js'

describe('mapPinStyle', () => {
  it('resolves kind defaults', () => {
    expect(resolveMapPinStyle('palco')).toMatchObject({
      border: MAP_PIN_KINDS.palco.border,
      glyph: MAP_PIN_KINDS.palco.glyph,
      text: false,
    })
  })

  it('allows per-place emoji override', () => {
    const style = resolveMapPinStyle('local', { emoji: '⛪' })
    expect(style.glyph).toBe('⛪')
    expect(style.border).toBe(MAP_PIN_KINDS.local.border)
    expect(style.text).toBe(false)
  })

  it('uses restroom emoji for WC', () => {
    const style = resolveMapPinStyle('wc')
    expect(style.glyph).toBe('🚻')
    expect(style.text).toBe(false)
    expect(mapPinHtml(style)).toContain('🚻')
    expect(mapPinHtml(style)).toContain(style.border)
  })

  it('parking looks like a blue P sign', () => {
    const style = resolveMapPinStyle('estacionamentoPublico')
    expect(style.fill).toBe('#0055A4')
    expect(style.color).toBe('#FFFFFF')
    expect(style.glyph).toBe('P')
    const html = mapPinHtml(style)
    expect(html).toContain('#0055A4')
    expect(html).toContain('#FFFFFF')
    expect(html).toContain('22%')
  })

  it('private parking uses green P sign', () => {
    const style = resolveMapPinStyle('estacionamentoPrivado')
    expect(style.fill).toBe('#1B5E3F')
    expect(style.glyph).toBe('P')
    expect(mapPinHtml(style)).toContain('#1B5E3F')
  })

  it('supports custom iconKey for sede barrete pin', () => {
    const style = resolveMapPinStyle('local', { iconKey: 'barrete' })
    expect(style.iconKey).toBe('barrete')
    expect(style.glyph).toContain('<svg')
    expect(style.glyph).toContain('#1FA64A')
    expect(style.text).toBe(false)
  })
})
