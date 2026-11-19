/** Shortage math shared by the Calendar banner, per-meal rows and "add to shopping". */

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
  const base = id ? `id:${id}` : `name:${s.name.trim().toLowerCase()}`;
  return `${base}|${(s.unit ?? '').trim().toLowerCase()}`;
}

function nameUnitKey(name: string, unit?: string | null): string {
  return `${name.trim().toLowerCase()}|${(unit ?? '').trim().toLowerCase()}`;
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
  const onList = new Map<string, number>();
  for (const row of shoppingList) {
    if (row.checked) continue;
    const key = nameUnitKey(row.name, row.unit);
    onList.set(key, (onList.get(key) ?? 0) + (Number(row.quantity) || 0));
  }
  return shortages.filter((s) => {
    const have = onList.get(nameUnitKey(s.name, s.unit)) ?? 0;
    return have + 1e-6 < shortageDeficit(s);
  });
}

/** "Rice 150 g" label for banners and per-meal rows (deficit, not gross need). */
export function shortageLabel(s: ShortageLike): string {
  return `${s.name} ${shortageDeficit(s)} ${s.unit}`.trim();
}
