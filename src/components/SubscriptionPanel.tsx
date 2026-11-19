import { useEffect, useState } from 'react';
import { subscriptionApi, type SubscriptionStatus } from '../api/subscription';
import { shouldClearOutboundRedirectLoading } from '../utils/outboundRedirectLoading';
import { UpgradeButtons } from './UpgradeButtons';

const CHECKOUT_STATUS_POLL_MS = 3000;
const CHECKOUT_STATUS_POLL_MAX = 5;

interface SubscriptionPanelProps {
  /** When false (keep-alive hidden), skip fetch; refetch when becoming true. */
  active?: boolean;
  checkoutSuccess?: boolean;
  /** Stripe Checkout Session id from ?session_id=; verified server-side on return. */
  checkoutSessionId?: string | null;
  checkoutCancelled?: boolean;
  portalReturn?: boolean;
}

export function SubscriptionPanel({
  active = true,
  checkoutSuccess = false,
  checkoutSessionId = null,
  checkoutCancelled = false,
  portalReturn = false,
}: SubscriptionPanelProps) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [statusData, plansData] = await Promise.all([
        subscriptionApi.getStatus(),
        subscriptionApi.getPlans(),
      ]);
      setStatus(statusData);
      setStripeEnabled(plansData.stripeCheckoutEnabled);
    } catch {
      setError('Could not load subscription status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void (async () => {
      // Returning from Stripe: verify the session server-side first so Pro activates even
      // when the webhook is late or not configured. Failure falls back to plain polling.
      if (checkoutSuccess && checkoutSessionId) {
        try {
          await subscriptionApi.confirmCheckout(checkoutSessionId);
        } catch {
          // webhook / polling below will still pick it up
        }
      }
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [active, checkoutSuccess, checkoutSessionId, portalReturn]);

  // After Stripe Checkout the webhook can land a few seconds after the redirect.
  // Re-check status a bounded number of times until Pro shows up (no endless loop).
  const statusIsPro = status?.isPro ?? false;
  useEffect(() => {
    if (!active || !checkoutSuccess || statusIsPro) return;
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      try {
        if (checkoutSessionId) {
          await subscriptionApi.confirmCheckout(checkoutSessionId).catch(() => undefined);
        }
        const next = await subscriptionApi.getStatus();
        setStatus(next);
        if (next.isPro) window.clearInterval(timer);
      } catch {
        // keep the last known status; give up after the cap below
      }
      if (attempts >= CHECKOUT_STATUS_POLL_MAX) window.clearInterval(timer);
    }, CHECKOUT_STATUS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [active, checkoutSuccess, checkoutSessionId, statusIsPro]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (shouldClearOutboundRedirectLoading(event)) {
        setPortalLoading(false);
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const openPortal = async () => {
    setPortalLoading(true);
    setPortalError('');
    try {
      const { portalUrl } = await subscriptionApi.createPortal();
      window.location.href = portalUrl;
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : 'Unable to open billing portal');
      setPortalLoading(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted">Loading subscription…</p>;
  }

  if (error) {
    return <p className="text-sm text-herb">{error}</p>;
  }

  if (!status) {
    return null;
  }

  const usage = status.usage;
  const showUpgrade = !status.isPro;
  const showManage = status.isPro && stripeEnabled;

  return (
    <div className="space-y-6">
      {checkoutSuccess && (
        <div className="border border-herb bg-sage/30 p-4 text-sm text-ink">
          {status.isPro
            ? 'Payment received. Your Pro subscription is active.'
            : 'Payment received. Your Pro subscription should activate shortly.'}
        </div>
      )}

      {checkoutCancelled && (
        <div className="border border-line bg-linen p-4 text-sm text-muted">
          Checkout was cancelled. You can upgrade anytime from here.
        </div>
      )}

      {portalReturn && (
        <div className="border border-line bg-linen p-4 text-sm text-muted">
          Back from billing portal. Your plan status is shown below.
        </div>
      )}

      <div>
        <h2 className="font-display text-xl font-semibold text-ink mb-2">Your plan</h2>
        <p className="text-sm text-muted">
          {status.isPro
            ? status.isTrial
              ? `Pro trial active until ${formatDate(status.trialEndsAt)}.`
              : `${status.planName ?? 'Pro'} active${status.expiresAt ? ` until ${formatDate(status.expiresAt)}` : ''}.`
            : 'You are on the Free plan. Upgrade anytime for a 7-day Pro trial.'}
        </p>
      </div>

      <div className="border border-line p-4">
        <h3 className="text-sm font-semibold text-ink mb-3">Usage this period</h3>
        <ul className="space-y-2 text-sm">
          <UsageRow
            label="AI messages today"
            used={usage.aiMessagesUsed}
            limit={usage.aiMessagesLimit}
          />
          <UsageRow label="Recipes saved" used={usage.recipeCount} limit={usage.recipeLimit} />
          <UsageRow
            label="Image uploads this month"
            used={usage.imageUploadsUsed}
            limit={usage.imageUploadsLimit}
          />
        </ul>
      </div>

      {showManage && (
        <div className="border border-line p-4">
          <h3 className="font-display text-lg font-semibold text-ink">Billing</h3>
          <p className="mt-2 text-sm text-muted">
            Update payment method, switch plans, or cancel in the Stripe customer portal.
          </p>
          <button
            type="button"
            onClick={openPortal}
            disabled={portalLoading}
            className="btn-secondary mt-4 disabled:opacity-60"
          >
            {portalLoading ? 'Opening…' : 'Manage billing'}
          </button>
          {portalError ? <p className="mt-2 text-sm text-herb">{portalError}</p> : null}
        </div>
      )}

      {showUpgrade && (
        <div className="border border-herb bg-sage/20 p-4">
          <h3 className="font-display text-lg font-semibold text-ink">Start your 7-day Pro trial</h3>
          <p className="mt-2 text-sm text-muted">
            Try Pro free for 7 days — then 150 AI messages per day and unlimited recipes and uploads.
          </p>
          <p className="mt-3 text-sm text-muted">$4.99/month or $39.99/year after the trial.</p>
          <UpgradeButtons stripeEnabled={stripeEnabled} className="mt-4" />
        </div>
      )}
    </div>
  );
}

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit < 0;
  return (
    <li className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">
        {used} / {unlimited ? 'Unlimited' : limit}
      </span>
    </li>
  );
}

function formatDate(epochSeconds?: number): string {
  if (!epochSeconds) return '';
  return new Date(epochSeconds * 1000).toLocaleDateString();
}
