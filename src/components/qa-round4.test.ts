import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { unitSelectOptions } from '../utils/units.ts';
import { buyChipCount } from '../utils/chatEmptyChipCounts.ts';
import { shoppingBuyCount, UNDO_TOAST_MS } from '../utils/shoppingListState.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('recipe form unit dropdown', () => {
  it('offers every app unit (weight + volume + count) even for count ingredients', () => {
    const all = unitSelectOptions(undefined, 'metric', false);
    for (const u of ['g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'pcs', 'clove', 'can', 'slice', 'stalk', 'bunch']) {
      assert.ok(all.includes(u), `missing ${u}`);
    }
  });

  it('RecipeManager does not restrict UnitSelect by kind or system', () => {
    const src = read('src/components/RecipeManager.tsx');
    const blocks = src.match(/<UnitSelect[\s\S]*?\/>/g) ?? [];
    assert.ok(blocks.length >= 2);
    for (const b of blocks) {
      assert.doesNotMatch(b, /kind=/);
      assert.doesNotMatch(b, /preferSystemUnits/);
    }
  });
});

describe('shopping check-off flow', () => {
  const src = read('src/components/ShoppingList.tsx');

  it('has no pending-pantry button, review sheet or second sync path', () => {
    assert.doesNotMatch(src, /shopping\.syncToPantry/);
    assert.doesNotMatch(src, /shopping\.pendingSync/);
    assert.doesNotMatch(src, /openReviewSheet|handleConfirmSync|showReview/);
  });

  it('syncs once on check-off and shows an 8s Undo toast that is fixed and clickable', () => {
    assert.equal(UNDO_TOAST_MS, 8000);
    assert.match(src, /syncShoppingItemsToPantry\(\[\{ id \}\]\)/);
    assert.match(src, /UNDO_TOAST_MS/);
    assert.match(src, /data-testid="shopping-toast"/);
    assert.match(src, /fixed bottom-6[^"]*z-\[80\]/);
    // toast state lives in refs/state independent of the list refetch effect
    assert.doesNotMatch(src, /setShowMessage\(false\)[\s\S]{0,40}oriShoppingList/);
  });
});

describe('shared shopping count', () => {
  it('Pantry header, Shopping header and Chat home use the same helper', () => {
    assert.match(read('src/components/PantryInventory.tsx'), /shoppingBuyCount\(shoppingList\)/);
    assert.doesNotMatch(read('src/components/PantryInventory.tsx'), /filter\(item => \(item\.item_to_buy/);
    assert.match(read('src/components/ShoppingList.tsx'), /shoppingBuyCount\(shoppingList\)/);
    const rows = [{ checked: false }, { checked: false }, { checked: true, synced_to_pantry: true }];
    assert.equal(shoppingBuyCount(rows), 2);
    assert.equal(buyChipCount(rows), 2);
  });
});

describe('calendar and chat wiring', () => {
  it('Plan my week auto-sends; today row expands by local date', () => {
    const cal = read('src/components/Calendar.tsx');
    assert.match(cal, /onAskAi\(t\('calendar\.planWeekPrompt'\), \{ autoSend: true \}\)/);
    assert.match(cal, /defaultExpandedDay\(currentWeekStart, now\)/);
    assert.match(read('src/App.tsx'), /pendingPromptAutoSend=\{pendingAiAutoSend\}/);
  });

  it('recipe cards list ingredients and hide the today button when already scheduled', () => {
    const src = read('src/components/AICookingAssistant.tsx');
    assert.match(src, /ai\.recipeIngredients/);
    assert.match(src, /!scheduledToday && \(/);
  });
});
