import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { subscriptionApi, type PlansResponse } from '../api/subscription';

interface PricingSectionProps {
  onGetStarted: () => void;
}

/** Mirrors backend-cf subscription PLANS + FREE_TIER / PRO_TIER when API is unavailable. */
const FALLBACK_PLANS: PlansResponse = {
  trialDays: 7,
  stripeCheckoutEnabled: false,
  free: {
    aiMessagesPerWeek: 50,
    recipeImportsPerMonth: 3,
    maxRecipes: 50,
    imageUploadsPerMonth: 10,
  },
  pro: {
    aiMessagesPerWeek: 300,
    recipeImportsPerMonth: 50,
    maxRecipes: -1,
    imageUploadsPerMonth: -1,
  },
  plans: [
    {
      name: 'Pro Monthly',
      billingPeriod: 'monthly',
      priceCents: 499,
      currency: 'USD',
      priceDisplay: '$4.99/mo',
      productIdIos: 'com.lardermind.pro.monthly',
      productIdAndroid: 'com.lardermind.pro.monthly',
    },
    {
      name: 'Pro Yearly',
      billingPeriod: 'yearly',
      priceCents: 3999,
      currency: 'USD',
      priceDisplay: '$39.99/yr',
      productIdIos: 'com.lardermind.pro.yearly',
      productIdAndroid: 'com.lardermind.pro.yearly',
    },
  ],
};

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-line py-2 text-sm last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </li>
  );
}

export function PricingSection({ onGetStarted }: PricingSectionProps) {
  const { t } = useTranslation();
  // Start with fallbacks so Pro prices are visible above the fold of this section
  // even before / if the plans API responds.
  const [plans, setPlans] = useState<PlansResponse>(FALLBACK_PLANS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await subscriptionApi.getPlans();
        if (!cancelled) setPlans(data);
      } catch {
        if (!cancelled) setPlans(FALLBACK_PLANS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const free = plans.free;
  const pro = plans.pro;

  return (
    <section id="pricing" className="border-t border-line px-[5%] py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-ink">
            {t('pricing.title')}
          </h2>
          <p className="mt-3 text-lg text-muted">
            {t('pricing.subtitle', { free: free.aiMessagesPerWeek, pro: pro.aiMessagesPerWeek })}
          </p>
          {plans.trialDays ? (
            <p className="mt-2 text-sm text-herb">
              {t('pricing.trial', { days: plans.trialDays })}
            </p>
          ) : null}
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          <div className="border border-line bg-linen p-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted">{t('pricing.free')}</p>
            <p className="mt-3 font-display text-4xl font-semibold text-ink">$0</p>
            <p className="mt-1 text-sm text-muted">{t('pricing.forever')}</p>
            <ul className="mt-8">
              <LimitRow label={t('pricing.pantryShoppingCalendar')} value={t('pricing.fullAccess')} />
              <LimitRow label={t('pricing.aiChat')} value={t('pricing.perWeek', { count: free.aiMessagesPerWeek })} />
              <LimitRow label={t('pricing.recipes')} value={t('pricing.upTo', { count: free.maxRecipes })} />
              <LimitRow label={t('pricing.imageUploads')} value={t('pricing.perMonthLimit', { count: free.imageUploadsPerMonth })} />
            </ul>
            <button type="button" onClick={onGetStarted} className="btn-secondary mt-8 w-full">
              {t('pricing.signUp')}
            </button>
          </div>

          {plans.plans.map((plan) => (
            <div key={plan.name} className="border border-herb bg-sage/20 p-8">
              <p className="text-sm font-semibold uppercase tracking-widest text-herb">{t('pricing.pro')}</p>
              <p className="mt-3 font-display text-4xl font-semibold text-ink">{plan.priceDisplay}</p>
              <p className="mt-1 text-sm text-muted">
                {plan.billingPeriod === 'yearly' ? t('pricing.perYear') : t('pricing.perMonth')}
              </p>
              <ul className="mt-8">
                <LimitRow label={t('pricing.aiChat')} value={t('pricing.perWeek', { count: pro.aiMessagesPerWeek })} />
                <LimitRow label={t('pricing.recipes')} value={pro.maxRecipes < 0 ? t('pricing.unlimited') : String(pro.maxRecipes)} />
                <LimitRow label={t('pricing.imageUploads')} value={pro.imageUploadsPerMonth < 0 ? t('pricing.unlimited') : t('pricing.perMonthLimit', { count: pro.imageUploadsPerMonth })} />
                <LimitRow label={t('pricing.prioritySupport')} value={t('pricing.included')} />
              </ul>
              <button type="button" onClick={onGetStarted} className="btn-primary mt-8 w-full">
                {plan.billingPeriod === 'yearly' ? t('pricing.startAnnual') : t('pricing.startMonthly')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
