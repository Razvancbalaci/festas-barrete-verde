import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  clearAdminActivity,
  startAdminIdleWatch,
} from '../lib/adminSessionIdle'

/**
 * Com sessão admin activa: logout automático após inactividade.
 * Corre em toda a app (não só /admin) — cobre testes no site público.
 */
export default function AdminSessionGuard() {
  const signingOut = useRef(false)

  useEffect(() => {
    let stopWatch = null

    async function expire() {
      if (signingOut.current) return
      signingOut.current = true
      try {
        await supabase.auth.signOut()
      } catch {
        /* ignore */
      } finally {
        signingOut.current = false
      }
    }

    function attach() {
      if (stopWatch) return
      stopWatch = startAdminIdleWatch({ onExpire: expire })
    }

    function detach() {
      stopWatch?.()
      stopWatch = null
      clearAdminActivity()
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) attach()
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Não reiniciar o idle watch em TOKEN_REFRESHED — senão o refresh
      // automático prolongava a sessão sem actividade do utilizador.
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session) attach()
        else detach()
        return
      }
      if (event === 'SIGNED_OUT' || !session) {
        detach()
      }
    })

    return () => {
      detach()
      sub.subscription.unsubscribe()
    }
  }, [])

  return null
}
