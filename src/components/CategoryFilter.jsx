import { CATEGORIES, CATEGORY_COLORS } from '../data/categories'
import { useLang } from '../context/LangContext'

export default function CategoryFilter({ selected, onSelect }) {
  const { t } = useLang()

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/45">
        {t.filterCategory}
      </p>
      <div className="flex max-w-full flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
            selected === null
              ? 'bg-barrete text-white shadow-sm'
              : 'bg-white text-ink/70 shadow-sm hover:bg-barrete/5'
          }`}
        >
          {t.filterAll}
        </button>
        {CATEGORIES.map((cat) => {
          const colors = CATEGORY_COLORS[cat]
          const active = selected === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelect(active ? null : cat)}
              className="rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200"
              style={
                active
                  ? {
                      backgroundColor: colors.border,
                      color: '#fff',
                      borderColor: colors.border,
                    }
                  : {
                      backgroundColor: colors.bg,
                      color: colors.text,
                      borderColor: 'transparent',
                    }
              }
            >
              {t.categories[cat]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
