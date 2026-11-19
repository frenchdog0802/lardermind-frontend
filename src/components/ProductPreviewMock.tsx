import { useTranslation } from 'react-i18next';

const WEEK_PLAN = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const GROCERY_ITEMS = [
  { key: 'chicken', qty: 'pack', checked: false },
  { key: 'lemons', qty: 'two', checked: false },
  { key: 'garlic', qty: 'bulb', checked: true },
  { key: 'pasta', qty: 'pasta', checked: false },
  { key: 'salmon', qty: 'two', checked: false },
  { key: 'tortillas', qty: 'pack', checked: false },
  { key: 'spinach', qty: 'bag', checked: true },
] as const;

export function ProductPreviewMock() {
  const { t } = useTranslation();
  return (
    <section id="product-preview" className="border-t border-line bg-surface/60 px-[5%] py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-herb">{t('preview.eyebrow')}</p>
          <h2 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-ink">
            {t('preview.title')}
          </h2>
          <p className="mt-3 text-lg text-muted">
            {t('preview.subtitle')}
          </p>
        </div>

        <figure className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-line bg-linen shadow-[var(--shadow-md)]">
            <div className="flex items-center gap-2 border-b border-line bg-sage/40 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-line" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" aria-hidden="true" />
              <span className="ml-2 text-xs font-medium text-muted">{t('preview.window')}</span>
            </div>

            <div className="grid gap-0 lg:grid-cols-2">
              <div className="border-b border-line p-5 lg:border-b-0 lg:border-r">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-ink">{t('preview.thisWeek')}</h3>
                  <span className="rounded-full bg-sage/60 px-2.5 py-0.5 text-xs font-medium text-herb-deep">
                    {t('preview.dinnerPlan')}
                  </span>
                </div>
                <ul className="space-y-2">
                  {WEEK_PLAN.map((day) => (
                    <li
                      key={day}
                      className="flex items-start gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
                    >
                      <span className="w-9 shrink-0 text-sm font-semibold text-herb">{t(`preview.days.${day}`)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">{t(`preview.meals.${day}`)}</p>
                        <p className="mt-0.5 text-xs text-muted">{t('preview.dinner')}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-ink">{t('preview.shoppingList')}</h3>
                  <span className="text-xs font-medium text-muted">
                    {t('preview.left', { count: GROCERY_ITEMS.filter((i) => !i.checked).length })}
                  </span>
                </div>
                <ul className="space-y-2">
                  {GROCERY_ITEMS.map((item) => (
                    <li
                      key={item.key}
                      className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          item.checked
                            ? 'border-herb bg-herb text-white'
                            : 'border-line bg-linen'
                        }`}
                        aria-hidden="true"
                      >
                        {item.checked ? (
                          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2.5 6.5 5 9l4.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-sm font-medium ${
                            item.checked ? 'text-muted line-through' : 'text-ink'
                          }`}
                        >
                          {t(`preview.items.${item.key}`)}
                        </span>
                        <span className="text-xs text-muted">{t(`preview.qty.${item.qty}`)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 rounded-xl border border-line bg-sage/30 px-3 py-2 text-xs text-herb-deep">
                  {t('preview.builtFrom')}
                </p>
              </div>
            </div>
          </div>
          <figcaption className="mt-4 text-center text-sm text-muted">
            {t('preview.caption')}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
