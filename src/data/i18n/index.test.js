import { describe, expect, it } from 'vitest'
import { loadLocale, translations } from './index.js'

describe('i18n loadLocale', () => {
  it('returns PT synchronously from cache', async () => {
    const pt = await loadLocale('pt')
    expect(pt).toBe(translations.pt)
    expect(pt.admin?.title).toBeTruthy()
  })

  it('lazy-loads English and caches it', async () => {
    const en1 = await loadLocale('en')
    const en2 = await loadLocale('en')
    expect(en1).toBe(en2)
    expect(en1.map?.title || en1.admin?.title).toBeTruthy()
    expect(en1).not.toBe(translations.pt)
  })

  it('falls back to PT for unknown codes', async () => {
    const loc = await loadLocale('xx')
    expect(loc).toBe(translations.pt)
  })
})
