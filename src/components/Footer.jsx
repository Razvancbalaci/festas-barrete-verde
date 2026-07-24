import { useState } from 'react'
import { Bell, MessageSquarePlus } from 'lucide-react'
import { useLang } from '../context/LangContext'
import FeedbackForm from './FeedbackForm'
import NotifyPrefsForm from './NotifyPrefsForm'

export default function Footer() {
  const { t } = useLang()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)

  return (
    <>
      <footer className="mt-auto border-t border-barrete/10 bg-barrete text-white">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <p className="text-center text-sm leading-relaxed text-white/85">
            {t.disclaimer}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
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
