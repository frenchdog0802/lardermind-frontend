import {
  UnitKind,
  MeasurementSystem,
  displayUnitsForPreference,
  resolveIngredientUnits,
  formatQuantity,
  unitSelectOptions,
  resolveSelectedUnit,
} from '../utils/units';

interface UnitSelectProps {
  kind?: UnitKind | string | null;
  value: string;
  onChange: (unit: string) => void;
  measurementSystem?: MeasurementSystem;
  /** If true, only show units preferred for the measurement system (weight/volume). */
  preferSystemUnits?: boolean;
  className?: string;
  disabled?: boolean;
}

export function UnitSelect({
  kind,
  value,
  onChange,
  measurementSystem = 'metric',
  preferSystemUnits = false,
  className = '',
  disabled = false,
}: UnitSelectProps) {
  const resolvedKind = (kind as UnitKind | undefined) || undefined;
  // Unknown ingredient: let user pick any common unit
  const options = unitSelectOptions(resolvedKind, measurementSystem, preferSystemUnits);
  // Callers that save an untouched form must use resolveSelectedUnit() too, so the
  // unit shown here is the unit persisted.
  const current = resolveSelectedUnit(value, options);
  const opts = options.includes(current) ? options : [current, ...options];

  return (
    <select
      value={current}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      className={
        className ||
        'p-2 border border-line rounded-lg bg-surface text-ink disabled:opacity-60'
      }
      aria-label="Unit"
    >
      {opts.map(u => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}

/** Format a stored quantity (expressed in `unit`) for UI. */
export function QuantityLabel({
  quantity,
  unit,
  unitKind,
  baseUnit,
  defaultDisplayUnit,
  measurementSystem = 'metric',
  className = '',
}: {
  quantity: number;
  unit?: string;
  unitKind?: string;
  baseUnit?: string;
  defaultDisplayUnit?: string;
  measurementSystem?: MeasurementSystem;
  className?: string;
}) {
  const { kind, baseUnit: base, displayUnit } = resolveIngredientUnits({
    unit_kind: unitKind,
    // Pantry / shopping / recipe rows store quantity in `unit` (no ml/g normalisation).
    base_unit: unit || baseUnit,
    default_display_unit: defaultDisplayUnit,
    default_unit: unit,
  });
  const formatted = formatQuantity(quantity, {
    kind,
    baseUnit: base,
    system: measurementSystem,
    preferredDisplayUnit: displayUnit,
  });
  return (
    <span className={className}>
      {formatted.quantityLabel} {formatted.unit}
    </span>
  );
}

export function preferredUnitForIngredient(
  ingredient: {
    unit_kind?: string | null;
    base_unit?: string | null;
    default_unit?: string | null;
    default_display_unit?: string | null;
  } | null | undefined,
  measurementSystem: MeasurementSystem = 'metric',
): { kind: UnitKind | undefined; unit: string } {
  if (!ingredient) {
    return { kind: undefined, unit: '' };
  }
  const hasHint =
    ingredient.unit_kind ||
    ingredient.base_unit ||
    ingredient.default_unit ||
    ingredient.default_display_unit;
  if (!hasHint) {
    return { kind: undefined, unit: '' };
  }

  const resolved = resolveIngredientUnits(ingredient);
  if (resolved.kind === 'count') {
    return { kind: resolved.kind, unit: resolved.displayUnit };
  }
  const systemUnits = displayUnitsForPreference(resolved.kind, measurementSystem);
  if (systemUnits.includes(resolved.displayUnit)) {
    return { kind: resolved.kind, unit: resolved.displayUnit };
  }
  return { kind: resolved.kind, unit: systemUnits[0] || resolved.baseUnit };
}
