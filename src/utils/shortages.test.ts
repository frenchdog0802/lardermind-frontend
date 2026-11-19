import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  aggregateShortages,
  planRangeShortages,
  shortageDeficit,
  shortageLabel,
  shortagesNotOnList,
} from './shortages.ts';

describe('shortage totals agree across meal rows, banner and shopping list', () => {
  const meals = [
    {
      serving_date: '2026-11-21',
      status: 'short',
      shortages: [{ name: 'Rice', needed: 300, available: 150, unit: 'g' }],
    },
    {
      serving_date: '2026-11-22',
      status: 'short',
      shortages: [{ name: 'rice', needed: 300, available: 0, unit: 'g' }],
    },
    { serving_date: '2026-11-18', status: 'ok', shortages: [] },
  ];

  it('per-meal Need is the deficit, not the gross need', () => {
    assert.equal(shortageDeficit(meals[0]!.shortages[0]!), 150);
    assert.equal(shortageLabel(meals[0]!.shortages[0]!), 'Rice 150 g');
  });

  it('plan-range totals include Sunday Nov 22 when the week is Nov 15-21', () => {
    const r = planRangeShortages(meals, '2026-11-15');
    assert.equal(r.shortages.length, 1);
    assert.equal(r.shortages[0]!.needed, 450);
    assert.equal(r.from, '2026-11-21');
    assert.equal(r.to, '2026-11-22');
    // same number the shopping list would receive
    assert.equal(
      aggregateShortages(meals.map((m) => m.shortages))[0]!.needed,
      r.shortages[0]!.needed,
    );
  });

  it('no shortages at all yields an empty banner list (rice 300 g with 1 kg stock)', () => {
    const r = planRangeShortages(
      [{ serving_date: '2026-11-22', status: 'ok', shortages: [] }],
      '2026-11-15',
    );
    assert.deepEqual(r.shortages, []);
  });

  it('is idempotent once the missing items are on the shopping list', () => {
    const missing = aggregateShortages(meals.map((m) => m.shortages));
    assert.equal(shortagesNotOnList(missing, []).length, 1);
    assert.equal(
      shortagesNotOnList(missing, [{ name: 'Rice', quantity: 450, unit: 'g', checked: false }]).length,
      0,
    );
    // a checked-off row does not count
    assert.equal(
      shortagesNotOnList(missing, [{ name: 'Rice', quantity: 450, unit: 'g', checked: true }]).length,
      1,
    );
    // partially covered still offers the add
    assert.equal(
      shortagesNotOnList(missing, [{ name: 'Rice', quantity: 100, unit: 'g' }]).length,
      1,
    );
  });
});
