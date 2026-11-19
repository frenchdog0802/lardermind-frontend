/** Undo toasts (pantry delete, shopping check-off, ...) stay up this long. */
export const UNDO_TOAST_MS = 8000;
/** Plain info toasts (no Undo action). */
export const INFO_TOAST_MS = 3000;

type ShoppingRow = { checked?: boolean; synced_to_pantry?: boolean };

/** Items the Shopping page still lists: everything except check-offs already moved to the pantry. */
export function isOnShoppingList(item: ShoppingRow): boolean {
    return !(item.checked && item.synced_to_pantry);
}

/**
 * Buy count: rows still on the list (unchecked, or checked but not yet moved to
 * the pantry), so it matches what the Shopping page shows mid-check-off.
 */
export function shoppingBuyCount(items: unknown): number {
    if (!Array.isArray(items)) return 0;
    return items.filter(
        (item) => item != null && typeof item === 'object' && isOnShoppingList(item as ShoppingRow),
    ).length;
}

export type ShoppingEmptyState = 'list' | 'empty' | 'no_match' | 'in_progress';

/**
 * Which body the list card should show. "Empty" must never appear while rows are
 * still on the list or a check-off request is in flight.
 */
export function shoppingEmptyState(opts: {
    visibleCount: number;
    onListCount: number;
    inFlightCount: number;
    searchQuery: string;
}): ShoppingEmptyState {
    if (opts.visibleCount > 0) return 'list';
    if (opts.searchQuery.trim() && opts.onListCount > 0) return 'no_match';
    if (opts.inFlightCount > 0 || opts.onListCount > 0) return 'in_progress';
    return 'empty';
}
