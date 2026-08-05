import pt from './pt.js'

export const LANGS = [
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' },
]

/** PT no caminho crítico; restantes em chunks lazy. */
const loaders = {
  en: () => import('./en.js'),
  fr: () => import('./fr.js'),
  es: () => import('./es.js'),
}

const cache = { pt }

/**
 * @param {string} code
 * @returns {Promise<object>}
 */
export async function loadLocale(code) {
  const lang = LANGS.some((l) => l.code === code) ? code : 'pt'
  if (cache[lang]) return cache[lang]
  const loader = loaders[lang]
  if (!loader) return pt
  try {
    const mod = await loader()
    cache[lang] = mod.default
    return cache[lang]
  } catch (err) {
    console.warn('Failed to load locale', lang, err)
    return pt
  }
}

/** Só PT síncrono — para testes / fallback. */
export const translations = { pt }

export { pt }
