import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { trackPageView } from '../lib/analytics'

export default function AnalyticsTracker() {
  const { pathname } = useLocation()
  const { lang } = useLang()
  const prevPath = useRef(null)

  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    if (prevPath.current === pathname) return
    prevPath.current = pathname
    trackPageView(pathname, { lang })
  }, [pathname, lang])

  return null
}
