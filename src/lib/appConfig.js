import { supabase } from './supabase'
import { setLiveSmokeTest } from './liveSmokeTest'

let liveSmokeTestEnabled = false
let loaded = false
let loadPromise = null

export function isLiveSmokeGateEnabled() {
  return liveSmokeTestEnabled
}

export function isAppConfigLoaded() {
  return loaded
}

export function setLiveSmokeGateEnabled(value) {
  const next = Boolean(value)
  const changed = liveSmokeTestEnabled !== next
  liveSmokeTestEnabled = next
  if (!liveSmokeTestEnabled) {
    setLiveSmokeTest(false)
  }
  // Só notificar quando muda — senão AppConfigProvider.refresh() cria loop
  // (fetch → event → fetch) até Out of Memory.
  if (!changed) return
  try {
    window.dispatchEvent(new CustomEvent('fbv-app-config-changed'))
  } catch {
    /* ignore */
  }
}

/** Lê flag — só com sessão admin autenticada. Anónimos → sempre desligado. */
export async function fetchAppConfig({ force = false } = {}) {
  if (!force && loadPromise) return loadPromise

  loadPromise = (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setLiveSmokeGateEnabled(false)
        return { liveSmokeTestEnabled: false, missingTable: false, authenticated: false }
      }

      const { data, error } = await supabase
        .from('app_config')
        .select('live_smoke_test_enabled')
        .eq('id', 1)
        .maybeSingle()

      if (error) {
        if (error.code === '42P01' || /does not exist/i.test(error.message || '')) {
          setLiveSmokeGateEnabled(false)
          return { liveSmokeTestEnabled: false, missingTable: true, authenticated: true }
        }
        console.warn('[appConfig]', error)
        setLiveSmokeGateEnabled(false)
        return { liveSmokeTestEnabled: false, error, authenticated: true }
      }

      setLiveSmokeGateEnabled(Boolean(data?.live_smoke_test_enabled))
      return {
        liveSmokeTestEnabled: liveSmokeTestEnabled,
        missingTable: false,
        authenticated: true,
      }
    } catch (err) {
      console.warn('[appConfig]', err)
      setLiveSmokeGateEnabled(false)
      return { liveSmokeTestEnabled: false, error: err, authenticated: false }
    } finally {
      loaded = true
      loadPromise = null
    }
  })()

  return loadPromise
}

/** Só back-office autenticado. */
export async function updateLiveSmokeTestEnabled(enabled) {
  const { data, error } = await supabase
    .from('app_config')
    .update({ live_smoke_test_enabled: Boolean(enabled) })
    .eq('id', 1)
    .select('live_smoke_test_enabled')
    .maybeSingle()

  if (error) throw error
  setLiveSmokeGateEnabled(Boolean(data?.live_smoke_test_enabled))
  return liveSmokeTestEnabled
}

/** Reset para testes ou mudança de sessão. */
export function resetAppConfigCache() {
  liveSmokeTestEnabled = false
  loaded = false
  loadPromise = null
}
