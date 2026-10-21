/** Pantry chip count from context list (item rows). */
export function pantryChipCount(items: unknown): number {
  return Array.isArray(items) ? items.length : 0;
}

/** Buy chip count: unchecked shopping-list rows only. */
export function buyChipCount(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.filter(
    (item) =>
      item != null &&
      typeof item === 'object' &&
      !(item as { checked?: unknown }).checked,
  ).length;
}
