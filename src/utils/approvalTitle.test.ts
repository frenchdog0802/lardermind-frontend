import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approvalToolTitleKey, isRecipeScheduledOn, localYmd } from './approvalTitle.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('approval card titles', () => {
  it('maps tool names to i18n keys, never the raw name', () => {
    assert.equal(approvalToolTitleKey('createRecipe'), 'ai.approvalTool.createRecipe');
    assert.equal(approvalToolTitleKey('planMeals'), 'ai.approvalTool.planMeals');
    assert.equal(approvalToolTitleKey('somethingNew'), 'ai.approvalTool.generic');
  });

  it('en.json and zh.json define a title for every mutating tool', () => {
    for (const lang of ['en', 'zh']) {
      const json = JSON.parse(readFileSync(join(root, `src/i18n/locales/${lang}.json`), 'utf8'));
      for (const tool of [
        'addPantryItems', 'updatePantryItems', 'removePantryItems', 'addItemsToShoppingList',
        'addMealPlanShortagesToShoppingList', 'createRecipe', 'updateRecipe', 'addRecipeToMenu',
        'planMeals', 'updatePreferences', 'generic',
      ]) {
        assert.ok(json.ai.approvalTool[tool], `${lang}: ai.approvalTool.${tool}`);
      }
    }
  });

  it('both chat surfaces render the readable title', () => {
    for (const f of ['AICookingAssistant.tsx', 'GuestChatBox.tsx']) {
      const src = readFileSync(join(root, 'src/components', f), 'utf8');
      assert.match(src, /approvalToolTitleKey\(/);
      assert.doesNotMatch(src, /<span className="font-medium text-ink">\{tool\.name\}<\/span>/);
    }
  });
});

describe('recipe card scheduling check', () => {
  it('formats local dates and detects an existing dinner today', () => {
    assert.equal(localYmd(new Date(2026, 10, 18)), '2026-11-18');
    const plans = [{ recipe_id: 'r1', serving_date: '2026-11-18', status: 'PLANNED' }];
    assert.equal(isRecipeScheduledOn(plans, 'r1', '2026-11-18'), true);
    assert.equal(isRecipeScheduledOn(plans, 'r1', '2026-11-19'), false);
    assert.equal(isRecipeScheduledOn(plans, 'r2', '2026-11-18'), false);
    assert.equal(
      isRecipeScheduledOn([{ recipe_id: 'r1', serving_date: '2026-11-18', status: 'SKIPPED' }], 'r1', '2026-11-18'),
      false,
    );
  });
});
