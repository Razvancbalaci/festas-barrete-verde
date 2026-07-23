/** Caminhos relativos seguros para deep links da app (anti open-redirect). */
export function sanitizeAppPath(url, fallback = '/') {
  if (url == null || url === '') return fallback
  const raw = String(url).trim()
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//')) return fallback
  if (/[\u0000-\u001F]/.test(raw)) return fallback
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return fallback
  // só path + query + hash simples
  if (!/^\/[\w\-./?&=%+#@,~]*$/i.test(raw)) return fallback
  return raw.slice(0, 500) || fallback
}

export function absoluteAppUrl(path, origin) {
  const safe = sanitizeAppPath(path, '/')
  try {
    return new URL(safe, origin || 'https://invalid.local').href
  } catch {
    return safe
  }
}
