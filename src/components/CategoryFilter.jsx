import { CATEGORIES, CATEGORY_COLORS } from '../data/categories'
import { useLang } from '../context/LangContext'

export default function CategoryFilter({
  selected,
  onSelect,
  available,
  showLabel = true,
}) {
  const { t } = useLang()
  const cats =
    available === undefined
      ? CATEGORIES
      : CATEGORIES.filter((cat) => (available || []).includes(cat))

  return (
    <div className="w-full text-left">
      {showLabel ? (
        <p className="mb-2 text-left text-xs font-semibold uppercase tracking-wider text-ink/45">
          {t.filterCategory}
        </p>
      ) : null}
      <div className="flex w-full flex-wrap justify-start gap-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
            selected === null
              ? 'bg-barrete text-white shadow-sm'
              : 'bg-white text-ink/70 shadow-sm hover:bg-barrete/5'
          }`}
        >
          {t.filterAll}
        </button>
        {cats.map((cat) => {
          const colors = CATEGORY_COLORS[cat]
          const active = selected === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelect(active ? null : cat)}
              className="shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200"
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
