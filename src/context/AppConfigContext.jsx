import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchAppConfig,
  isLiveSmokeGateEnabled,
  resetAppConfigCache,
} from '../lib/appConfig'

const AppConfigContext = createContext({
  ready: false,
  liveSmokeTestEnabled: false,
  missingTable: false,
  refresh: async () => {},
})

export function AppConfigProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [liveSmokeTestEnabled, setLiveSmokeTestEnabled] = useState(false)
  const [missingTable, setMissingTable] = useState(false)

  async function refresh() {
    const res = await fetchAppConfig({ force: true })
    setLiveSmokeTestEnabled(Boolean(res.liveSmokeTestEnabled))
    setMissingTable(Boolean(res.missingTable))
    setReady(true)
    return res
  }

  useEffect(() => {
    let cancelled = false
    refresh().then(() => {
      if (!cancelled) setReady(true)
    })
    // O módulo já actualizou o flag — só sincronizar React state (não re-fetch).
    const onChange = () => {
      if (cancelled) return
      setLiveSmokeTestEnabled(isLiveSmokeGateEnabled())
      setReady(true)
    }
    window.addEventListener('fbv-app-config-changed', onChange)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      resetAppConfigCache()
      if (!cancelled) refresh()
    })
    return () => {
      cancelled = true
      window.removeEventListener('fbv-app-config-changed', onChange)
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AppConfigContext.Provider
      value={{ ready, liveSmokeTestEnabled, missingTable, refresh }}
    >
      {children}
    </AppConfigContext.Provider>
  )
}

export function useAppConfig() {
  return useContext(AppConfigContext)
}

/** Atalho síncrono (após fetch inicial). */
export function useLiveSmokeGate() {
  const ctx = useAppConfig()
  return {
    ...ctx,
    enabled: ctx.ready ? ctx.liveSmokeTestEnabled : isLiveSmokeGateEnabled(),
  }
}
