/** Shortage math shared by the Calendar banner, per-meal rows and "add to shopping". */
import { fromBase, kindOf, normalizeUnit, toBase } from './units.ts';

export type ShortageLike = {
  ingredient_id?: string;
  name: string;
  needed: number;
  available?: number;
  unit: string;
};

export type ShortageMealLike = {
  meal_plan_id?: string;
  serving_date: string;
  status?: string;
  shortages: ShortageLike[];
};

type ShoppingRowLike = {
  name: string;
  quantity: number | string;
  unit?: string | null;
  checked?: boolean;
};

const round = (n: number) => Math.round(n * 1000) / 1000;

/** What is still missing for one shortage (needed minus on hand). */
export function shortageDeficit(s: ShortageLike): number {
  return round(Math.max(0, (s.needed ?? 0) - (s.available ?? 0)));
}

function itemKey(s: { ingredient_id?: string; name: string; unit?: string | null }): string {
  const id = s.ingredient_id?.trim();
  const base = id ? `id:${id}` : `name:${shortageNameKey(s.name)}`;
  return `${base}|${(s.unit ?? '').trim().toLowerCase()}`;
}

const NAME_NOISE = new Set(['fresh', 'large', 'small', 'medium', 'whole', 'organic', 'ripe', 'raw', 'extra', 'virgin', 'pure', 'plain', 'big']);
const COOK_STATE = new Set(['cooked', 'uncooked', 'dry', 'dried']);
const STAPLES = new Set(['rice', 'pasta', 'spaghetti', 'macaroni', 'penne', 'noodle', 'quinoa', 'couscous', 'oat', 'oatmeal', 'bean', 'lentil', 'chickpea', 'barley']);

function singular(t: string): string {
  if (t.length <= 3 || /[^a-z]/.test(t)) return t;
  if (t.endsWith('ies') && t.length > 4) return `${t.slice(0, -3)}y`;
  if (/(oes|ches|shes|xes|sses)$/.test(t)) return t.slice(0, -2);
  if (t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us')) return t.slice(0, -1);
  return t;
}

/** Mirrors the backend ingredientNameKey: case / plural / filler words / cooked-vs-dry staples. */
export function shortageNameKey(name: string): string {
  let tokens = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[,;]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !NAME_NOISE.has(t))
    .map(singular);
  if (tokens.some((t) => STAPLES.has(t))) tokens = tokens.filter((t) => !COOK_STATE.has(t));
  return tokens.join(' ');
}

/** Row quantity expressed in `unit` when both are the same measurement family; else null. */
function rowQtyInUnit(qty: number, rowUnit: string | null | undefined, unit: string | null | undefined): number | null {
  const from = normalizeUnit(rowUnit);
  const to = normalizeUnit(unit);
  if (from === to) return qty;
  const kind = kindOf(from);
  if (!from || !to || kind === 'count' || kind == null || kind !== kindOf(to)) return null;
  return fromBase(toBase(qty, from, kind), to, kind);
}

/** Sum deficits (never gross needs) of several per-meal lists into one buy list. */
export function aggregateShortages(lists: ShortageLike[][]): Array<ShortageLike & { available: number }> {
  const out: Array<ShortageLike & { available: number }> = [];
  for (const list of lists) {
    for (const s of list) {
      const deficit = shortageDeficit(s);
      if (deficit <= 0) continue;
      const existing = out.find((o) => itemKey(o) === itemKey(s));
      if (existing) existing.needed = round(existing.needed + deficit);
      else {
        out.push({
          ...(s.ingredient_id ? { ingredient_id: s.ingredient_id } : {}),
          name: s.name,
          needed: deficit,
          available: 0,
          unit: s.unit,
        });
      }
    }
  }
  return out;
}

/**
 * Plan-range totals: every short meal from `fromDate` onward, so a plan that runs
 * past the visible calendar week (Sun 22 in the next week) is not silently dropped.
 * Returns the aggregated list plus the date span the totals cover.
 */
export function planRangeShortages(
  meals: ShortageMealLike[],
  fromDate: string,
): { shortages: Array<ShortageLike & { available: number }>; from: string | null; to: string | null } {
  const short = meals.filter(
    (m) => m.status === 'short' && m.serving_date >= fromDate && m.shortages.length > 0,
  );
  const dates = short.map((m) => m.serving_date).sort();
  return {
    shortages: aggregateShortages(short.map((m) => m.shortages)),
    from: dates[0] ?? null,
    to: dates[dates.length - 1] ?? null,
  };
}

/**
 * Shortages not yet covered by unchecked shopping-list rows (same name + unit,
 * quantity >= deficit). Used to keep "Add all missing" idempotent.
 */
export function shortagesNotOnList<T extends ShortageLike>(
  shortages: T[],
  shoppingList: ShoppingRowLike[],
): T[] {
  return shortages.filter((s) => qtyStillToBuy(s.name, s.unit, shortageDeficit(s), shoppingList) > 1e-6);
}

/** Quantity of `name` already on unchecked shopping rows, expressed in `unit` (0 if none / incompatible). */
export function qtyOnShoppingList(
  name: string,
  unit: string | null | undefined,
  shoppingList: ShoppingRowLike[],
): number {
  const key = shortageNameKey(name);
  let have = 0;
  for (const row of shoppingList) {
    if (row.checked || shortageNameKey(row.name) !== key) continue;
    const q = rowQtyInUnit(Number(row.quantity) || 0, row.unit, unit);
    if (q != null) have += q;
  }
  return have;
}

/**
 * What is still left to add for a need once rows already on the list are counted. Adding
 * the full need on top of a partially covered row (e.g. 1 clove on the list, 4 needed)
 * would double count (list 5 vs calendar 4); only the remainder is ever added.
 */
export function qtyStillToBuy(
  name: string,
  unit: string | null | undefined,
  need: number,
  shoppingList: ShoppingRowLike[],
): number {
  return round(Math.max(0, need - qtyOnShoppingList(name, unit, shoppingList)));
}

/** "Rice 150 g" label for banners and per-meal rows (deficit, not gross need). */
export function shortageLabel(s: ShortageLike): string {
  return `${s.name} ${shortageDeficit(s)} ${s.unit}`.trim();
}
