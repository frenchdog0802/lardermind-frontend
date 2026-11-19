import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it, mock } from 'node:test';
import { fileURLToPath } from 'node:url';
import { resolveSelectedUnit, unitSelectOptions } from '../utils/units.ts';
import {
  defaultExpandedDay,
  formatLocalDate,
  parseLocalDate,
  relativeDayKey,
  shortageRangeLabel,
  startOfWeekLocal,
} from '../utils/calendarDates.ts';
import { createToastController } from '../utils/toastTimer.ts';
import { UNDO_TOAST_MS } from '../utils/shoppingListState.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('pantry add keeps the selected unit (item 1)', () => {
  const allOptions = unitSelectOptions(undefined, 'metric', false);

  it('Salt 100 g / Black Pepper 10 g resolve to g, never pcs', () => {
    assert.equal(resolveSelectedUnit('g', allOptions), 'g');
    assert.equal(resolveSelectedUnit('g', allOptions), 'g');
    // a count-only option list is what used to hide g from the form
    assert.ok(allOptions.includes('g') && allOptions.includes('pcs'));
  });

  it('PantryInventory offers all units and does not restrict by catalog kind', () => {
    const src = read('src/components/PantryInventory.tsx');
    assert.doesNotMatch(src, /addFormUnitKind/);
    assert.match(src, /unitSelectOptions\(undefined, measurementSystem, false\)/);
    const block = src.match(/<UnitSelect[\s\S]*?\/>/)?.[0] ?? '';
    assert.doesNotMatch(block, /kind=/);
    assert.doesNotMatch(block, /preferSystemUnits/);
    assert.match(src, /addPantryItem\(\{ \.\.\.newItem, unit: displayedUnit \}\)/);
  });

  it('catalog default unit never overwrites a unit the user picked', () => {
    const src = read('src/components/PantryInventory.tsx');
    assert.match(src, /unitTouchedRef\.current = true/);
    assert.match(src, /unit: unitTouchedRef\.current\s*\?\s*prev\.unit\s*:\s*preferredUnitForIngredient\(match/);
    assert.match(src, /unit: unitTouchedRef\.current\s*\?\s*prev\.unit\s*:\s*preferredUnitForIngredient\(ingredient/);
  });
});

describe('calendar dates (items 4 and 5)', () => {
  // Wed 2026-11-18 local
  const now = new Date(2026, 10, 18, 23, 30);

  it('parses YYYY-MM-DD as a local date', () => {
    const d = parseLocalDate('2026-11-22');
    assert.equal(d.getDate(), 22);
    assert.equal(d.getHours(), 0);
    assert.equal(formatLocalDate(d), '2026-11-22');
  });

  it('only labels the exact local day as today/tomorrow', () => {
    assert.equal(relativeDayKey('2026-11-18', now), 'today');
    assert.equal(relativeDayKey('2026-11-19', now), 'tomorrow');
    assert.equal(relativeDayKey('2026-11-17', now), 'yesterday');
    assert.equal(relativeDayKey('2026-11-22', now), null);
  });

  const fmt = {
    relative: (k: string) => k,
    short: (d: Date, wd: boolean) => `${wd ? 'W ' : ''}${d.getMonth() + 1}/${d.getDate()}`,
    range: (a: string, b: string) => `${a} - ${b}`,
  };

  it('range label is explicit and never says Tomorrow for a multi-day range', () => {
    assert.equal(shortageRangeLabel('2026-11-19', '2026-11-22', fmt, now), '11/19 - 11/22');
    assert.equal(shortageRangeLabel('2026-11-18', '2026-11-22', fmt, now), '11/18 - 11/22');
  });

  it('single-day range uses relative words only when real', () => {
    assert.equal(shortageRangeLabel('2026-11-19', '2026-11-19', fmt, now), 'tomorrow');
    assert.equal(shortageRangeLabel('2026-11-22', '2026-11-22', fmt, now), 'W 11/22');
  });

  it('default expanded day is today (local) for the current week, even late evening', () => {
    assert.equal(formatLocalDate(startOfWeekLocal(now)), '2026-11-15');
    assert.equal(defaultExpandedDay(startOfWeekLocal(now), now), '2026-11-18');
  });

  it('default expanded day is the first day when today is not in the week', () => {
    assert.equal(defaultExpandedDay(new Date(2026, 10, 22), now), '2026-11-22');
  });

  it('Calendar initialises expansion to today instead of []', () => {
    const src = read('src/components/Calendar.tsx');
    assert.match(src, /useState<string\[\]>\(\(\) => \[\s*defaultExpandedDay\(startOfWeekLocal\(new Date\(\)\)\)/);
    assert.doesNotMatch(src, /toISOString\(\)/);
  });
});

describe('undo toast timing (item 6)', () => {
  it('stays visible a full 8s and is not restarted by update()', () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      const seen: Array<string | null> = [];
      const c = createToastController(s => seen.push(s ? s.text : null));
      c.show('added', ['a'], UNDO_TOAST_MS);
      mock.timers.tick(1500); // slow network returns
      c.update('added (synced)', ['a', 'b']);
      assert.deepEqual(c.current, { text: 'added (synced)', undoIds: ['a', 'b'] });
      mock.timers.tick(6400); // 7.9s since show
      assert.notEqual(c.current, null);
      mock.timers.tick(200); // 8.1s
      assert.equal(c.current, null);
      assert.equal(seen.at(-1), null);
    } finally {
      mock.timers.reset();
    }
  });

  it('update() is a no-op once the toast is gone', () => {
    const c = createToastController(() => undefined);
    c.update('x', null);
    assert.equal(c.current, null);
  });

  it('ShoppingList shows the toast before awaiting the network', () => {
    const src = read('src/components/ShoppingList.tsx');
    const handler = src.slice(src.indexOf('const handleTogglePurchased'));
    const showAt = handler.indexOf("showToast(t('shopping.itemAddedToPantry'");
    const awaitAt = handler.indexOf('await updateShoppingListItem');
    assert.ok(showAt > 0 && showAt < awaitAt);
    assert.match(handler, /toast\.update\(/);
  });
});
