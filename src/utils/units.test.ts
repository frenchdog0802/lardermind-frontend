import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatQuantity, resolveSelectedUnit, unitSelectOptions } from './units.ts';

describe('formatQuantity with non-canonical stored units', () => {
  it('shows 1 l for a pantry row stored as 1 l (was "0 l")', () => {
    const out = formatQuantity(1, {
      kind: 'volume',
      baseUnit: 'l',
      system: 'metric',
      preferredDisplayUnit: 'l',
    });
    assert.equal(`${out.quantityLabel} ${out.unit}`, '1 l');
  });

  it('accepts unit aliases such as "liter"', () => {
    const out = formatQuantity(1.5, {
      kind: 'volume',
      baseUnit: 'liter',
      system: 'metric',
      preferredDisplayUnit: 'l',
    });
    assert.equal(`${out.quantityLabel} ${out.unit}`, '1.5 l');
  });

  it('shows 2 kg for a row stored as 2 kg', () => {
    const out = formatQuantity(2, {
      kind: 'weight',
      baseUnit: 'kg',
      system: 'metric',
      preferredDisplayUnit: 'kg',
    });
    assert.equal(`${out.quantityLabel} ${out.unit}`, '2 kg');
  });

  it('keeps canonical ml / g rows unchanged', () => {
    const ml = formatQuantity(250, { kind: 'volume', baseUnit: 'ml', system: 'metric', preferredDisplayUnit: 'ml' });
    assert.equal(`${ml.quantityLabel} ${ml.unit}`, '250 ml');
    const g = formatQuantity(500, { kind: 'weight', baseUnit: 'g', system: 'metric', preferredDisplayUnit: 'g' });
    assert.equal(`${g.quantityLabel} ${g.unit}`, '500 g');
  });
});

describe('unit select default', () => {
  it('an untouched add form saves the unit it shows (g), not an empty unit', () => {
    const options = unitSelectOptions(undefined, 'metric', true);
    assert.equal(options[0], 'g');
    assert.equal(resolveSelectedUnit('', options), 'g');
    assert.equal(resolveSelectedUnit('ml', options), 'ml');
  });
});
