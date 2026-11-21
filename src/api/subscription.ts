import { api } from './client';

export interface UsageSummary {
  aiMessagesUsed: number;
  aiMessagesLimit: number;
  /** 'week' (ISO week, Mon 00:00 UTC) for signed-in users; absent on older backends (treated as 'week'). */
  aiMessagesPeriod?: 'day' | 'week';
  /** Unix seconds (UTC) when the AI message counter resets. */
  aiMessagesResetsAt?: number;
  recipeImportsUsed: number;
  recipeImportsLimit: number;
  recipeCount: number;
  recipeLimit: number;
  imageUploadsUsed: number;
  imageUploadsLimit: number;
}

export interface SubscriptionStatus {
  isPro: boolean;
  isTrial: boolean;
  trialEndsAt?: number;
  expiresAt?: number;
  productId?: string;
  planName?: string;
  usage: UsageSummary;
}

export interface TierComparison {
  aiMessagesPerWeek: number;
  recipeImportsPerMonth: number;
  maxRecipes: number;
  imageUploadsPerMonth: number;
}

export interface Plan {
  name: string;
  billingPeriod: string;
  priceCents: number;
  currency: string;
  priceDisplay: string;
  productIdIos: string;
  productIdAndroid: string;
}

export interface PlansResponse {
  plans: Plan[];
  free: TierComparison;
  pro: TierComparison;
  trialDays: number;
  stripeCheckoutEnabled: boolean;
}

export interface ConfirmCheckoutResult {
  activated: boolean;
  isPro: boolean;
  isTrial: boolean;
  status: string;
}

export type CheckoutStartResult =
  | { kind: 'checkout'; checkoutUrl: string }
  | { kind: 'portal'; portalUrl: string };

function unwrap<T>(response: { success: boolean; message?: string; data?: T }): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.message ?? 'Subscription request failed');
  }
  return response.data;
}

function readStoredJwt(): string {
  const stored = localStorage.getItem('jwt');
  if (!stored) return '';
  try {
    const parsed = JSON.parse(stored);
    return typeof parsed === 'string' ? parsed : stored;
  } catch {
    return stored;
  }
}

export const subscriptionApi = {
  getPlans: async (): Promise<PlansResponse> => {
    const response = await api.get<PlansResponse>('/api/subscription/plans');
    return unwrap(response);
  },

  getStatus: async (): Promise<SubscriptionStatus> => {
    if (!readStoredJwt()) {
      throw new Error('Sign in to view subscription status');
    }
    const response = await api.get<SubscriptionStatus>('/api/subscription/status');
    return unwrap(response);
  },

  syncPurchase: async (payload: { productId: string; transactionId: string; platform: string }) => {
    const response = await api.post<{ success: boolean; status: SubscriptionStatus }>(
      '/api/subscription/sync',
      payload,
    );
    return unwrap(response);
  },

  createCheckout: async (billingPeriod: 'monthly' | 'yearly'): Promise<CheckoutStartResult> => {
    const response = await api.post<{ checkoutUrl?: string; portalUrl?: string }>(
      '/api/subscription/checkout',
      { billingPeriod },
    );
    if (response.data?.portalUrl) {
      return { kind: 'portal', portalUrl: response.data.portalUrl };
    }
    if (response.success && response.data?.checkoutUrl) {
      return { kind: 'checkout', checkoutUrl: response.data.checkoutUrl };
    }
    throw new Error(response.message ?? 'Unable to start checkout');
  },

  /**
   * Server-side verification of the Stripe Checkout Session we returned from. Activates Pro
   * even when the webhook is late / missing (idempotent).
   */
  confirmCheckout: async (sessionId: string): Promise<ConfirmCheckoutResult> => {
    const response = await api.post<ConfirmCheckoutResult>('/api/subscription/confirm', { sessionId });
    return unwrap(response);
  },

  createPortal: async (): Promise<{ portalUrl: string }> => {
    const response = await api.post<{ portalUrl: string }>('/api/subscription/portal');
    return unwrap(response);
  },
};

export function formatLimit(value: number): string {
  return value < 0 ? 'Unlimited' : String(value);
}
