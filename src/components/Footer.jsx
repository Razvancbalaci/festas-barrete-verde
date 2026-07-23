import { Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'

export default function Footer() {
  const { t } = useLang()

  return (
    <footer className="mt-auto border-t border-barrete/10 bg-barrete text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-center text-sm leading-relaxed text-white/85">
          {t.safetyNote}
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <span className="text-xs text-white/40">© 2026 Alcochete</span>
          <Link
            to="/admin"
            className="text-xs text-white/35 transition-colors hover:text-white/70"
          >
            {t.adminLink}
          </Link>
        </div>
      </div>
    </footer>
  )
}
