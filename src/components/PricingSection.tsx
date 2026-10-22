import { useEffect, useState } from 'react';
import { formatLimit, subscriptionApi, type PlansResponse } from '../api/subscription';

interface PricingSectionProps {
  onGetStarted: () => void;
}

/** Mirrors backend-cf subscription PLANS + FREE_TIER / PRO_TIER when API is unavailable. */
const FALLBACK_PLANS: PlansResponse = {
  trialDays: 7,
  stripeCheckoutEnabled: false,
  free: {
    aiMessagesPerDay: 20,
    recipeImportsPerMonth: 3,
    maxRecipes: 50,
    imageUploadsPerMonth: 10,
  },
  pro: {
    aiMessagesPerDay: 200,
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
            Free vs Pro
          </h2>
          <p className="mt-3 text-lg text-muted">
            Full kitchen management on Free. Pro raises daily AI chat, recipe imports, and upload
            limits — from {free.aiMessagesPerDay} to {pro.aiMessagesPerDay} messages/day.
          </p>
          {plans.trialDays ? (
            <p className="mt-2 text-sm text-herb">
              New accounts get {plans.trialDays} days of Pro to try everything.
            </p>
          ) : null}
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          <div className="border border-line bg-linen p-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted">Free</p>
            <p className="mt-3 font-display text-4xl font-semibold text-ink">$0</p>
            <p className="mt-1 text-sm text-muted">Forever</p>
            <ul className="mt-8">
              <LimitRow label="Pantry, shopping, calendar" value="Full access" />
              <LimitRow label="AI chat" value={`${free.aiMessagesPerDay} / day`} />
              <LimitRow
                label="URL / YouTube / Instagram import"
                value={`${free.recipeImportsPerMonth} / month`}
              />
              <LimitRow label="Recipes" value={`Up to ${free.maxRecipes}`} />
              <LimitRow label="Image uploads" value={`${free.imageUploadsPerMonth} / month`} />
            </ul>
            <button type="button" onClick={onGetStarted} className="btn-secondary mt-8 w-full">
              Sign up free
            </button>
          </div>

          {plans.plans.map((plan) => (
            <div key={plan.name} className="border border-herb bg-sage/20 p-8">
              <p className="text-sm font-semibold uppercase tracking-widest text-herb">Pro</p>
              <p className="mt-3 font-display text-4xl font-semibold text-ink">{plan.priceDisplay}</p>
              <p className="mt-1 text-sm text-muted">
                per {plan.billingPeriod === 'yearly' ? 'year' : 'month'}
                {plan.billingPeriod === 'yearly' ? ' · save ~33%' : ''}
              </p>
              <ul className="mt-8">
                <LimitRow label="AI chat" value={`${pro.aiMessagesPerDay} / day`} />
                <LimitRow
                  label="Social / URL imports"
                  value={`${pro.recipeImportsPerMonth} / month`}
                />
                <LimitRow label="Recipes" value={formatLimit(pro.maxRecipes)} />
                <LimitRow label="Image uploads" value={formatLimit(pro.imageUploadsPerMonth)} />
                <LimitRow label="Priority support" value="Included" />
              </ul>
              <button type="button" onClick={onGetStarted} className="btn-primary mt-8 w-full">
                Start with {plan.billingPeriod === 'yearly' ? 'annual' : 'monthly'} Pro
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
