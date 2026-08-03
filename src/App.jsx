import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom'
import { LangProvider, useLang } from './context/LangContext'
import { A11yProvider } from './context/A11yContext'
import { useReminderTicker } from './hooks/useLocalExtras'
import PublicProgram from './pages/PublicProgram'
import Privacy from './pages/Privacy'
import NotFound from './pages/NotFound'
import InstallPrompt from './components/InstallPrompt'
import NotifyPrompt from './components/NotifyPrompt'
import OfflineBanner from './components/OfflineBanner'
import AnalyticsTracker from './components/AnalyticsTracker'
import { track } from './lib/analytics'

const FestivalMap = lazy(() => import('./pages/FestivalMap'))
const Admin = lazy(() => import('./pages/Admin'))
const Negocios = lazy(() => import('./pages/Negocios'))

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-barrete/25 border-t-barrete"
        aria-hidden
      />
      <span className="sr-only">A carregar…</span>
    </div>
  )
}

/** Ao mudar de rota (ex. footer → privacidade), ir ao topo do ecrã. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function AppExtras() {
  const { t } = useLang()
  useReminderTicker(t)

  useEffect(() => {
    const onInstall = () => track('pwa_install')
    window.addEventListener('appinstalled', onInstall)
    return () => window.removeEventListener('appinstalled', onInstall)
  }, [])

  return (
    <>
      <ScrollToTop />
      <AnalyticsTracker />
      <OfflineBanner />
      <InstallPrompt />
      <NotifyPrompt />
    </>
  )
}

export default function App() {
  return (
    <LangProvider>
      <A11yProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<PublicProgram />} />
              <Route path="/mapa" element={<FestivalMap />} />
              <Route path="/comercio" element={<Negocios />} />
              <Route path="/negocios" element={<Navigate to="/comercio" replace />} />
              <Route path="/privacidade" element={<Privacy />} />
              <Route path="/privacy" element={<Navigate to="/privacidade" replace />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <AppExtras />
        </BrowserRouter>
      </A11yProvider>
    </LangProvider>
  )
}
