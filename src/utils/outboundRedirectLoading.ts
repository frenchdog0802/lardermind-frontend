/**
 * After Stripe Checkout / Customer Portal, browser Back often restores the SPA
 * from the bfcache with in-memory "Redirecting…" state still set.
 */
export function shouldClearOutboundRedirectLoading(event: {
  persisted: boolean;
}): boolean {
  return event.persisted === true;
}
