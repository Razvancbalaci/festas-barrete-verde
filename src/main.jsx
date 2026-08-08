import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { SW_UPDATE_EVENT } from './components/AppUpdateBanner.jsx'

const CHECK_UPDATE_MS = 60 * 60 * 1000

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    try {
      window.dispatchEvent(
        new CustomEvent(SW_UPDATE_EVENT, {
          detail: { update: () => updateSW(true) },
        }),
      )
    } catch {
      /* ignore */
    }
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return
    window.setInterval(() => {
      try {
        registration.update()
      } catch {
        /* ignore */
      }
    }, CHECK_UPDATE_MS)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
