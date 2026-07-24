import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLang } from '../context/LangContext'
import Footer from '../components/Footer'
import Header from '../components/Header'

export default function Privacy() {
  const { t } = useLang()
  const p = t.privacy

  return (
    <div className="flex min-h-dvh flex-col bg-creme text-ink">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-barrete hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {p.back}
        </Link>

        <h1 className="font-display text-2xl font-bold text-barrete sm:text-3xl">
          {p.title}
        </h1>
        <p className="mt-2 text-sm text-ink/55">{p.updated}</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-ink/80">
          {p.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-2 font-display text-lg font-semibold text-barrete">
                {section.heading}
              </h2>
              {section.paragraphs.map((text, i) => (
                <p key={i} className="mt-2">
                  {text}
                </p>
              ))}
              {section.bullets?.length ? (
                <ul className="mt-3 list-disc space-y-1.5 pl-5">
                  {section.bullets.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}
