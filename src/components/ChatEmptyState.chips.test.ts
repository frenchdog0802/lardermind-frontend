import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function readEmptyStateSource(): string {
  return readFileSync(join(root, 'src/components/ChatEmptyState.tsx'), 'utf8');
}

function readAssistantSource(): string {
  return readFileSync(join(root, 'src/components/AICookingAssistant.tsx'), 'utf8');
}

describe('web chat empty-state context chips', () => {
  it('renders pantry/buy chips from i18n and loads lists on mount', () => {
    const src = readEmptyStateSource();
    assert.match(src, /ai\.chipPantry/);
    assert.match(src, /ai\.chipBuy/);
    assert.match(src, /pantryChipCount|buyChipCount/);
    assert.match(src, /fetchAllPantryItems/);
    assert.match(src, /fetchAllShoppingListItems/);
    assert.match(src, /useEffect\(/);
  });

  it('AICookingAssistant passes pantry/shopping navigation into ChatEmptyState', () => {
    const src = readAssistantSource();
    assert.match(
      src,
      /<ChatEmptyState[\s\S]*onViewPantry=\{onViewPantry\}[\s\S]*onViewShoppingList=\{onViewShoppingList\}/,
    );
  });
});
