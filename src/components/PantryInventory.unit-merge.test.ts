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
      /updatePantryItem\(\{\s*\.\.\.existingItem,\s*quantity:\s*newItem\.quantity,\s*unit:\s*displayedUnit/,
      'merge path must send unit from the form',
    );
  });

  it('saves the unit the select displays when the user never touched it', () => {
    const src = readFileSync(join(root, 'src/components/PantryInventory.tsx'), 'utf8');
    assert.match(
      src,
      /const displayedUnit = resolveSelectedUnit\(\s*newItem\.unit,\s*unitSelectOptions\(undefined, measurementSystem, false\)/,
      'add path must resolve the unit exactly like UnitSelect (all units)',
    );
    assert.match(src, /addPantryItem\(\{ \.\.\.newItem, unit: displayedUnit \}\)/);
    assert.match(src, /fetchAllIngredients\(null\)/, 'must load ingredient catalog for search');
  });
});
