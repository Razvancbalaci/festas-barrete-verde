import { useEffect } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { LangProvider, useLang } from './context/LangContext'
import { A11yProvider } from './context/A11yContext'
import { useReminderTicker } from './hooks/useLocalExtras'
import PublicProgram from './pages/PublicProgram'
import FestivalMap from './pages/FestivalMap'
import Admin from './pages/Admin'
import Negocios from './pages/Negocios'
import InstallPrompt from './components/InstallPrompt'
import NotifyPrompt from './components/NotifyPrompt'
import OfflineBanner from './components/OfflineBanner'
import AnalyticsTracker from './components/AnalyticsTracker'
import { track } from './lib/analytics'

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
          <Routes>
            <Route path="/" element={<PublicProgram />} />
            <Route path="/mapa" element={<FestivalMap />} />
            <Route path="/comercio" element={<Negocios />} />
            <Route path="/negocios" element={<Navigate to="/comercio" replace />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
          <AppExtras />
        </BrowserRouter>
      </A11yProvider>
    </LangProvider>
  )
}
