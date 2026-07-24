import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLang } from '../context/LangContext'
import Footer from '../components/Footer'
import Header from '../components/Header'

export default function NotFound() {
  const { t } = useLang()
  const n = t.notFound

  return (
    <div className="flex min-h-dvh flex-col bg-creme text-ink">
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <p className="font-display text-5xl font-bold text-barrete/25">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-barrete sm:text-3xl">
          {n.title}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink/65">{n.body}</p>
        <Link
          to="/"
          className="mt-8 inline-flex w-fit items-center gap-1.5 rounded-xl bg-barrete px-5 py-2.5 text-sm font-semibold text-white hover:bg-barrete-light"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {n.back}
        </Link>
      </main>
      <Footer />
    </div>
  )
}
