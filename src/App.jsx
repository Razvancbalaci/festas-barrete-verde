import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { LangProvider, useLang } from './context/LangContext'
import { useReminderTicker } from './hooks/useLocalExtras'
import PublicProgram from './pages/PublicProgram'
import FestivalMap from './pages/FestivalMap'
import Admin from './pages/Admin'
import Negocios from './pages/Negocios'
import InstallPrompt from './components/InstallPrompt'
import NotifyPrompt from './components/NotifyPrompt'
import OfflineBanner from './components/OfflineBanner'

function AppExtras() {
  const { t } = useLang()
  useReminderTicker(t)
  return (
    <>
      <OfflineBanner />
      <InstallPrompt />
      <NotifyPrompt />
    </>
  )
}

export default function App() {
  return (
    <LangProvider>
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
    </LangProvider>
  )
}
