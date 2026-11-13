import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('PantryInventory merge update', () => {
  it('persists unit when merging into an existing pantry item', () => {
    const src = readFileSync(join(root, 'src/components/PantryInventory.tsx'), 'utf8');
    assert.match(
      src,
      /updatePantryItem\(\{\s*\.\.\.existingItem,\s*quantity:\s*newItem\.quantity,\s*unit:\s*newItem\.unit/,
      'merge path must send unit from the form',
    );
    assert.match(src, /fetchAllIngredients\(null\)/, 'must load ingredient catalog for search');
  });
});
