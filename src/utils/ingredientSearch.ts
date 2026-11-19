/**
 * Local ingredient autocomplete: matches case-insensitively, tolerates
 * singular/plural ("Egg" ~ "eggs") and always has a built-in list of common
 * ingredients, so suggestions never go blank when the catalog is empty or
 * hasn't loaded.
 */

import { isAscii } from './isAscii.ts';

export type IngredientSuggestion = {
    id: string;
    name: string;
    default_unit: string;
    unit_kind?: 'weight' | 'volume' | 'count';
    base_unit?: string;
    default_display_unit?: string;
    kind_locked?: boolean;
};

/** Common ingredients with app units (id is empty: not a catalog row). */
export const COMMON_INGREDIENTS: ReadonlyArray<{
    name: string;
    unit: string;
    kind: 'weight' | 'volume' | 'count';
}> = [
    { name: 'Egg', unit: 'pcs', kind: 'count' },
    { name: 'Milk', unit: 'ml', kind: 'volume' },
    { name: 'Butter', unit: 'g', kind: 'weight' },
    { name: 'Cheese', unit: 'g', kind: 'weight' },
    { name: 'Chicken breast', unit: 'g', kind: 'weight' },
    { name: 'Ground beef', unit: 'g', kind: 'weight' },
    { name: 'Rice', unit: 'g', kind: 'weight' },
    { name: 'Pasta', unit: 'g', kind: 'weight' },
    { name: 'Bread', unit: 'slice', kind: 'count' },
    { name: 'Flour', unit: 'g', kind: 'weight' },
    { name: 'Sugar', unit: 'g', kind: 'weight' },
    { name: 'Salt', unit: 'tsp', kind: 'volume' },
    { name: 'Black pepper', unit: 'tsp', kind: 'volume' },
    { name: 'Olive oil', unit: 'tbsp', kind: 'volume' },
    { name: 'Soy sauce', unit: 'tbsp', kind: 'volume' },
    { name: 'Onion', unit: 'pcs', kind: 'count' },
    { name: 'Garlic', unit: 'clove', kind: 'count' },
    { name: 'Tomato', unit: 'pcs', kind: 'count' },
    { name: 'Potato', unit: 'pcs', kind: 'count' },
    { name: 'Carrot', unit: 'pcs', kind: 'count' },
    { name: 'Banana', unit: 'pcs', kind: 'count' },
    { name: 'Apple', unit: 'pcs', kind: 'count' },
    { name: 'Lemon', unit: 'pcs', kind: 'count' },
    { name: 'Spinach', unit: 'g', kind: 'weight' },
    { name: 'Tofu', unit: 'g', kind: 'weight' },
];

function singular(word: string): string {
    if (word.length <= 3 || /[^a-z]/.test(word)) return word;
    if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
    if (/(oes|ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
    if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) {
        return word.slice(0, -1);
    }
    return word;
}

/** Lowercase, trimmed, singular-per-word form used for comparison. */
export function normalizeSearchText(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(singular)
        .join(' ');
}

const COMMON_AS_SUGGESTIONS: IngredientSuggestion[] = COMMON_INGREDIENTS.map((c) => ({
    id: '',
    name: c.name,
    default_unit: c.unit,
    unit_kind: c.kind,
    base_unit: c.kind === 'weight' ? 'g' : c.kind === 'volume' ? 'ml' : 'pcs',
    default_display_unit: c.unit,
}));

/**
 * Suggestions for `query`: catalog matches first, then common ingredients that
 * the catalog doesn't already cover. Empty query returns the first `limit`.
 */
export function searchIngredientNames<T extends IngredientSuggestion>(
    query: string,
    catalog: readonly T[],
    limit = 10,
): Array<T | IngredientSuggestion> {
    const q = normalizeSearchText(query);
    const seen = new Set<string>();
    const out: Array<T | IngredientSuggestion> = [];
    const consider = (item: T | IngredientSuggestion) => {
        const name = item.name?.trim();
        if (!name) return;
        const key = normalizeSearchText(name);
        if (seen.has(key)) return;
        if (q) {
            const raw = query.trim();
            // Non-ASCII names (e.g. Chinese) have no case / plural: plain substring.
            const hit = !isAscii(name) || !isAscii(raw)
                ? name.includes(raw)
                : key.includes(q) || name.toLowerCase().includes(raw.toLowerCase());
            if (!hit) return;
        }
        seen.add(key);
        out.push(item);
    };
    for (const item of catalog) consider(item);
    for (const item of COMMON_AS_SUGGESTIONS) consider(item);
    return out.slice(0, limit);
}

/** True when any ingredient row has a blank name (Save must stay blocked only then). */
export function hasEmptyIngredientName(
    ingredients: ReadonlyArray<{ name?: string | null }>,
): boolean {
    return ingredients.some((ingredient) => !(ingredient.name ?? '').trim());
}
