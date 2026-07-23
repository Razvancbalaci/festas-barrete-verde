import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { LangProvider } from './context/LangContext'
import PublicProgram from './pages/PublicProgram'
import Admin from './pages/Admin'
import Negocios from './pages/Negocios'
import InstallPrompt from './components/InstallPrompt'
import NotifyPrompt from './components/NotifyPrompt'

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicProgram />} />
          <Route path="/comercio" element={<Negocios />} />
          <Route path="/negocios" element={<Navigate to="/comercio" replace />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
        <InstallPrompt />
        <NotifyPrompt />
      </BrowserRouter>
    </LangProvider>
  )
}
