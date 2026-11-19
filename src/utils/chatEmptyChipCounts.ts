import { shoppingBuyCount } from './shoppingListState.ts';

/** Pantry chip count from context list (item rows). */
export function pantryChipCount(items: unknown): number {
  return Array.isArray(items) ? items.length : 0;
}

/** Buy chip count: rows still on the shopping list (incl. a check-off not yet moved to the pantry). */
export function buyChipCount(items: unknown): number {
  return shoppingBuyCount(items);
}
