import { useTranslation } from 'react-i18next';

const DAYS = [
  { day: 'mon', minutes: 35 },
  { day: 'tue', minutes: 20 },
  { day: 'wed', minutes: 20 },
  { day: 'thu', minutes: 25 },
  { day: 'fri', minutes: 30 },
] as const;

const SHOPPING_KEYS = ['i1', 'i2', 'i3', 'i4', 'i5'] as const;

interface SampleWeekProps {
  /** Receives the localized sample-pantry prompt to prefill the guest chat with. */
  onTry: (prompt: string) => void;
}

/** Static, clearly labeled example week shown near the top of the landing page. */
export function SampleWeek({ onTry }: SampleWeekProps) {
  const { t } = useTranslation();
  return (
    <section id="sample-week" className="border-t border-line px-[5%] py-16" data-testid="sample-week">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-herb">
            {t('landing.sample.eyebrow')}
          </p>
          <h2 className="mt-3 font-display text-[clamp(1.5rem,4vw,2rem)] font-semibold text-ink">
            {t('landing.sample.title')}
          </h2>
          <p className="mt-3 text-sm italic text-muted">{t('landing.sample.exampleLabel')}</p>
          <p className="mt-2 text-sm text-muted">{t('landing.sample.pantryNote')}</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="mb-3 font-display text-lg font-semibold text-ink">
              {t('landing.sample.planHeading')}
            </h3>
            <ul className="space-y-2">
              {DAYS.map(({ day, minutes }) => (
                <li
                  key={day}
                  className="flex items-center gap-3 rounded-xl border border-line bg-linen px-3 py-2.5"
                >
                  <span className="w-9 shrink-0 text-sm font-semibold text-herb">
                    {t(`preview.days.${day}`)}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-ink">
                    {t(`landing.sample.meals.${day}`)}
                  </span>
                  <span className="shrink-0 rounded-full bg-sage/60 px-2.5 py-0.5 text-xs font-medium text-herb-deep">
                    {t('landing.sample.minutes', { count: minutes })}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="mb-3 font-display text-lg font-semibold text-ink">
              {t('landing.sample.shoppingHeading')}
            </h3>
            <ul className="space-y-2">
              {SHOPPING_KEYS.map((key) => (
                <li key={key} className="flex items-center gap-3 text-sm text-ink">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-herb" aria-hidden="true" />
                  {t(`landing.sample.shopping.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4 text-center">
          <button
            type="button"
            onClick={() => onTry(t('landing.sample.pantryPrompt'))}
            className="btn-primary"
          >
            {t('landing.sample.cta')}
          </button>
          <p className="max-w-xl text-sm text-muted" data-testid="landing-free-pro-line">
            {t('landing.sample.freeProLine')}
          </p>
        </div>
      </div>
    </section>
  );
}
