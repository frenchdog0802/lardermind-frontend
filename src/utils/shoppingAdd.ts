import type { ShoppingListItem } from '../api/types.ts';
import { convert, kindOf, normalizeUnit } from './units.ts';

export type ShoppingAddPlan =
    | { action: 'merge'; existing: ShoppingListItem; quantity: number; unit: string }
    | { action: 'create' };

const round4 = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Manual add to the shopping list. Mirrors the server's additive merge:
 * same name (case-insensitive) on an unchecked row with the same or a
 * convertible unit (g/kg/oz/lb, ml/l/tsp/tbsp/cup) adds to that row in the row's
 * own unit; incompatible units (g vs pcs) get a separate row.
 */
export function planShoppingAdd(
    list: ShoppingListItem[],
    draft: { name: string; quantity: number; unit?: string },
): ShoppingAddPlan {
    const name = draft.name.trim().toLowerCase();
    const draftUnit = normalizeUnit(draft.unit) ?? 'pcs';
    const candidates = list.filter(i => !i.checked && i.name.trim().toLowerCase() === name);
    const rowUnit = (i: ShoppingListItem) => normalizeUnit(i.unit) ?? 'pcs';

    const same = candidates.find(i => rowUnit(i) === draftUnit);
    if (same) {
        return {
            action: 'merge',
            existing: same,
            quantity: round4(Number(same.quantity) + draft.quantity),
            unit: same.unit,
        };
    }
    for (const i of candidates) {
        const from = kindOf(draftUnit);
        if (!from || from === 'count' || from !== kindOf(rowUnit(i))) continue;
        return {
            action: 'merge',
            existing: i,
            quantity: round4(Number(i.quantity) + convert(draft.quantity, draftUnit, rowUnit(i))),
            unit: i.unit,
        };
    }
    return { action: 'create' };
}
