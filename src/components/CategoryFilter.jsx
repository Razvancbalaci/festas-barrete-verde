import { CATEGORIES, CATEGORY_COLORS } from '../data/categories'
import { useLang } from '../context/LangContext'

export default function CategoryFilter({ selected, onSelect, available }) {
  const { t } = useLang()
  const availableSet =
    available === undefined ? null : new Set(available || [])

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
          const enabled = availableSet == null || availableSet.has(cat)
          return (
            <button
              key={cat}
              type="button"
              disabled={!enabled}
              title={
                enabled
                  ? undefined
                  : t.categoryEmptyDay || 'Sem eventos neste dia'
              }
              onClick={() => {
                if (!enabled) return
                onSelect(active ? null : cat)
              }}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                enabled ? '' : 'cursor-not-allowed opacity-35'
              }`}
              style={
                !enabled
                  ? {
                      backgroundColor: '#F3F1EC',
                      color: '#8A857C',
                      borderColor: 'transparent',
                    }
                  : active
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
