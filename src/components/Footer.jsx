import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, MessageSquarePlus } from 'lucide-react'
import { useLang } from '../context/LangContext'
import FeedbackForm from './FeedbackForm'
import NotifyPrefsForm from './NotifyPrefsForm'

const APOSENTO_FACEBOOK =
  'https://www.facebook.com/aposentobarreteverde.alcochete'
const APOSENTO_INSTAGRAM =
  'https://www.instagram.com/aposentobarreteverde_oficial/'

function FacebookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14 13.5h2.5l.5-3H14V8.5c0-.8.2-1.3 1.4-1.3H17V4.1C16.7 4.1 15.7 4 14.6 4 12.1 4 10.4 5.5 10.4 8.2V10.5H8v3h2.4V20h3.6v-6.5z" />
    </svg>
  )
}

function InstagramIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
    </svg>
  )
}

export default function Footer() {
  const { t } = useLang()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const social = t.social

  return (
    <>
      <footer className="mt-auto border-t border-barrete/10 bg-barrete text-white">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <p className="text-center text-sm leading-relaxed text-white/85">
            {t.disclaimer}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <a
              href={APOSENTO_FACEBOOK}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social?.facebook ?? 'Facebook'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-dourado transition hover:bg-white/20"
            >
              <FacebookIcon className="h-4 w-4" />
            </a>
            <a
              href={APOSENTO_INSTAGRAM}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social?.instagram ?? 'Instagram'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-dourado transition hover:bg-white/20"
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => setPrefsOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/20"
            >
              <Bell className="h-3.5 w-3.5 text-dourado" aria-hidden />
              {t.notifyPrefs.link}
            </button>
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/20"
            >
              <MessageSquarePlus className="h-3.5 w-3.5 text-dourado" aria-hidden />
              {t.feedback.link}
            </button>
          </div>

          <p className="mt-5 text-center">
            <Link
              to="/privacidade"
              className="text-xs font-semibold text-white/70 underline-offset-2 hover:text-white hover:underline"
            >
              {t.privacy.link}
            </Link>
          </p>

          <div className="mt-6 flex items-center justify-center">
            <span className="select-none text-[0.65rem] tracking-widest text-white/20" aria-hidden>
              RB
            </span>
          </div>
        </div>
      </footer>

      <NotifyPrefsForm open={prefsOpen} onClose={() => setPrefsOpen(false)} />
      <FeedbackForm open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  )
}
