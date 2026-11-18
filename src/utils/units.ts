/** Shared unit system for recipe / cart / pantry display and form helpers. */

export type UnitKind = 'weight' | 'volume' | 'count';
export type MeasurementSystem = 'metric' | 'imperial';

export const WEIGHT_UNITS = ['g', 'kg', 'oz', 'lb'] as const;
export const VOLUME_UNITS = ['ml', 'l', 'tsp', 'tbsp', 'cup'] as const;
export const COUNT_UNITS = ['pcs', 'clove', 'can', 'slice', 'stalk', 'bunch'] as const;

const ALIASES: Record<string, string> = {
  gram: 'g', grams: 'g', gr: 'g',
  kilogram: 'kg', kilograms: 'kg', kgs: 'kg',
  ounce: 'oz', ounces: 'oz',
  pound: 'lb', pounds: 'lb', lbs: 'lb',
  milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml', mls: 'ml',
  liter: 'l', liters: 'l', litre: 'l', litres: 'l',
  teaspoon: 'tsp', teaspoons: 'tsp', tsps: 'tsp',
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbsps: 'tbsp', tb: 'tbsp',
  cups: 'cup',
  pc: 'pcs', piece: 'pcs', pieces: 'pcs', ea: 'pcs', each: 'pcs',
  cloves: 'clove', cans: 'can', slices: 'slice', stalks: 'stalk', bunches: 'bunch',
  // Chinese cooking units
  '大匙': 'tbsp', '湯匙': 'tbsp',
  '小匙': 'tsp', '茶匙': 'tsp',
  '杯': 'cup',
  '克': 'g', '公克': 'g',
  '公斤': 'kg',
  '毫升': 'ml',
  '升': 'l', '公升': 'l',
  '顆': 'pcs', '個': 'pcs', '塊': 'pcs', '條': 'pcs', '根': 'pcs',
  '片': 'slice',
  '瓣': 'clove',
  '罐': 'can',
  '把': 'bunch', '束': 'bunch',
};

const OZ_TO_G = 28.3495;
const LB_TO_G = 453.592;
const TSP_TO_ML = 5;
const TBSP_TO_ML = 15;
const CUP_TO_ML = 240;

const CUP_FRACTIONS: Array<{ label: string; value: number }> = [
  { label: '1/4', value: 0.25 },
  { label: '1/3', value: 1 / 3 },
  { label: '1/2', value: 0.5 },
  { label: '2/3', value: 2 / 3 },
  { label: '3/4', value: 0.75 },
];

export function normalizeUnit(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const key = raw.trim().toLowerCase();
  if (ALIASES[key]) return ALIASES[key];
  return key;
}

export function kindOf(unit?: string | null): UnitKind | null {
  const n = normalizeUnit(unit);
  if (!n) return null;
  if ((WEIGHT_UNITS as readonly string[]).includes(n)) return 'weight';
  if ((VOLUME_UNITS as readonly string[]).includes(n)) return 'volume';
  if ((COUNT_UNITS as readonly string[]).includes(n)) return 'count';
  return null;
}

export function baseUnitForKind(kind: UnitKind, countUnit?: string | null): string {
  if (kind === 'weight') return 'g';
  if (kind === 'volume') return 'ml';
  const n = normalizeUnit(countUnit);
  if (n && (COUNT_UNITS as readonly string[]).includes(n)) return n;
  return 'pcs';
}

export function allowedUnits(kind: UnitKind): string[] {
  if (kind === 'weight') return [...WEIGHT_UNITS];
  if (kind === 'volume') return [...VOLUME_UNITS];
  return [...COUNT_UNITS];
}

export function displayUnitsForPreference(kind: UnitKind, system: MeasurementSystem): string[] {
  if (kind === 'count') return [...COUNT_UNITS];
  if (kind === 'weight') return system === 'imperial' ? ['oz', 'lb'] : ['g', 'kg'];
  return system === 'imperial' ? ['tsp', 'tbsp', 'cup'] : ['ml', 'l'];
}

export function toBase(quantity: number, unit: string, kind: UnitKind): number {
  const n = normalizeUnit(unit);
  if (!n) throw new Error('Missing unit');
  if (kind === 'weight') {
    if (n === 'g') return quantity;
    if (n === 'kg') return quantity * 1000;
    if (n === 'oz') return quantity * OZ_TO_G;
    if (n === 'lb') return quantity * LB_TO_G;
  }
  if (kind === 'volume') {
    if (n === 'ml') return quantity;
    if (n === 'l') return quantity * 1000;
    if (n === 'tsp') return quantity * TSP_TO_ML;
    if (n === 'tbsp') return quantity * TBSP_TO_ML;
    if (n === 'cup') return quantity * CUP_TO_ML;
  }
  return quantity;
}

export function fromBase(baseQuantity: number, unit: string, kind: UnitKind): number {
  const n = normalizeUnit(unit);
  if (!n) throw new Error('Missing unit');
  if (kind === 'weight') {
    if (n === 'g') return baseQuantity;
    if (n === 'kg') return baseQuantity / 1000;
    if (n === 'oz') return baseQuantity / OZ_TO_G;
    if (n === 'lb') return baseQuantity / LB_TO_G;
  }
  if (kind === 'volume') {
    if (n === 'ml') return baseQuantity;
    if (n === 'l') return baseQuantity / 1000;
    if (n === 'tsp') return baseQuantity / TSP_TO_ML;
    if (n === 'tbsp') return baseQuantity / TBSP_TO_ML;
    if (n === 'cup') return baseQuantity / CUP_TO_ML;
  }
  return baseQuantity;
}

export function convert(quantity: number, fromUnit: string, toUnit: string): number {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (!from || !to) throw new Error('Unknown unit');
  if (from === to) return quantity;
  const kind = kindOf(from);
  const toKind = kindOf(to);
  if (!kind || !toKind || kind !== toKind) throw new Error(`Cannot convert ${from} to ${to}`);
  if (kind === 'count') throw new Error('Count units cannot be converted');
  return fromBase(toBase(quantity, from, kind), to, kind);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const r = round1(n);
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function nearestCupFraction(cups: number): { whole: number; frac?: string; approx: number } | null {
  const whole = Math.floor(cups + 1e-9);
  const fracPart = cups - whole;
  if (fracPart < 0.05) return { whole, approx: whole };
  let best: { label: string; value: number } | null = null;
  let bestDiff = Infinity;
  for (const f of CUP_FRACTIONS) {
    const d = Math.abs(fracPart - f.value);
    if (d < bestDiff) {
      bestDiff = d;
      best = f;
    }
  }
  if (best && bestDiff <= 0.06) {
    return { whole, frac: best.label, approx: whole + best.value };
  }
  return null;
}

/** Pick a display unit for a base quantity given preference + ingredient defaults. */
export function pickDisplayUnit(
  kind: UnitKind,
  baseQuantity: number,
  system: MeasurementSystem,
  preferredDisplayUnit?: string | null,
): string {
  if (kind === 'count') {
    return normalizeUnit(preferredDisplayUnit) ?? 'pcs';
  }

  const preferred = normalizeUnit(preferredDisplayUnit);
  if (preferred && kindOf(preferred) === kind) {
    const prefs = displayUnitsForPreference(kind, system);
    if (prefs.includes(preferred)) return preferred;
  }

  if (kind === 'weight') {
    if (system === 'imperial') {
      return baseQuantity >= LB_TO_G ? 'lb' : 'oz';
    }
    return baseQuantity >= 1000 ? 'kg' : 'g';
  }

  // volume
  if (system === 'imperial') {
    if (baseQuantity >= CUP_TO_ML * 0.25) return 'cup';
    if (baseQuantity >= TBSP_TO_ML) return 'tbsp';
    return 'tsp';
  }
  return baseQuantity >= 1000 ? 'l' : 'ml';
}

export function formatQuantityValue(quantity: number, unit: string, kind: UnitKind): string {
  const n = normalizeUnit(unit) ?? unit;
  if (kind === 'volume' && n === 'cup') {
    const match = nearestCupFraction(quantity);
    if (match) {
      if (match.whole === 0 && match.frac) return match.frac;
      if (match.frac) return `${match.whole} ${match.frac}`;
      return String(match.whole);
    }
    return formatNumber(quantity);
  }
  if (kind === 'volume' && (n === 'tsp' || n === 'tbsp')) {
    const halves = Math.round(quantity * 2) / 2;
    if (Math.abs(halves - quantity) < 0.08) {
      return formatNumber(halves);
    }
  }
  if (kind === 'weight' && (n === 'oz' || n === 'lb')) {
    return formatNumber(round1(quantity));
  }
  return formatNumber(quantity);
}

/**
 * Format a stored quantity for display. `quantity` is expressed in `opts.baseUnit`
 * (e.g. 1 with baseUnit 'l' means one litre), not necessarily canonical ml / g.
 */
export function formatQuantity(
  quantity: number,
  opts: {
    kind: UnitKind;
    baseUnit: string;
    system: MeasurementSystem;
    preferredDisplayUnit?: string | null;
  },
): { quantityLabel: string; unit: string; displayQuantity: number } {
  // Normalise to canonical ml / g first; fromBase() expects canonical input.
  const sourceUnit = normalizeUnit(opts.baseUnit);
  const baseQuantity =
    opts.kind !== 'count' && sourceUnit && kindOf(sourceUnit) === opts.kind
      ? toBase(quantity, sourceUnit, opts.kind)
      : quantity;
  const unit = pickDisplayUnit(opts.kind, baseQuantity, opts.system, opts.preferredDisplayUnit);
  const displayQuantity =
    opts.kind === 'count'
      ? baseQuantity
      : fromBase(baseQuantity, unit, opts.kind);
  return {
    quantityLabel: formatQuantityValue(displayQuantity, unit, opts.kind),
    unit,
    displayQuantity,
  };
}

/** Options shown by the unit <select> for a given kind / system. */
export function unitSelectOptions(
  kind: UnitKind | null | undefined,
  system: MeasurementSystem,
  preferSystemUnits: boolean,
): string[] {
  if (!kind) {
    return preferSystemUnits
      ? [
          ...displayUnitsForPreference('weight', system),
          ...displayUnitsForPreference('volume', system),
          ...COUNT_UNITS,
        ]
      : [...WEIGHT_UNITS, ...VOLUME_UNITS, ...COUNT_UNITS];
  }
  if (preferSystemUnits && kind !== 'count') {
    return displayUnitsForPreference(kind, system);
  }
  return allowedUnits(kind);
}

/** The unit the select actually displays (empty value falls back to the first option). */
export function resolveSelectedUnit(value: string | null | undefined, options: string[]): string {
  return value || options[0] || '';
}

export function parseFractionInput(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  }
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    return Number(frac[1]) / Number(frac[2]);
  }
  return null;
}

export function resolveIngredientUnits(ing: {
  unit_kind?: string | null;
  base_unit?: string | null;
  default_unit?: string | null;
  default_display_unit?: string | null;
}): { kind: UnitKind; baseUnit: string; displayUnit: string } {
  const kind =
    (ing.unit_kind as UnitKind) ||
    kindOf(ing.base_unit) ||
    kindOf(ing.default_unit) ||
    kindOf(ing.default_display_unit) ||
    'count';
  const baseUnit =
    normalizeUnit(ing.base_unit) ||
    baseUnitForKind(kind, ing.default_unit) ||
    'pcs';
  const displayUnit =
    normalizeUnit(ing.default_display_unit) ||
    normalizeUnit(ing.default_unit) ||
    baseUnit;
  return { kind, baseUnit, displayUnit };
}
