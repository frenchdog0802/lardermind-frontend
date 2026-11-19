import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { groupMealPlansByDate, mealTypePresence } from './calendarDates.ts';

describe('groupMealPlansByDate', () => {
  const plans = [
    { id: 'a', serving_date: '2026-11-19', meal_type: 'dinner' },
    { id: 'b', serving_date: '2026-11-20', meal_type: 'lunch' },
    { id: 'c', serving_date: '2026-11-19', meal_type: 'breakfast' },
  ];

  it('groups by date and keeps input order within a day', () => {
    const map = groupMealPlansByDate(plans);
    assert.deepEqual(map.get('2026-11-19')?.map((p) => p.id), ['a', 'c']);
    assert.deepEqual(map.get('2026-11-20')?.map((p) => p.id), ['b']);
    assert.equal(map.get('2026-11-21'), undefined);
    assert.equal(map.size, 2);
  });

  it('returns an empty map for no plans', () => {
    assert.equal(groupMealPlansByDate([]).size, 0);
  });
});

describe('mealTypePresence', () => {
  it('flags only the meal types present', () => {
    assert.deepEqual(mealTypePresence([{ meal_type: 'dinner' }, { meal_type: 'snack' }, { meal_type: 'other' }]), {
      breakfast: false,
      lunch: false,
      dinner: true,
      snack: true,
    });
  });
});
