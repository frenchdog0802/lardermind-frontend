import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('meal_plan_updated card meal rows', () => {
  it('reads camelCase with snake_case fallback', () => {
    const src = readFileSync(join(root, 'src/components/AICookingAssistant.tsx'), 'utf8');
    assert.match(src, /meal\.recipeName\s*\?\?\s*meal\.meal_name/);
    assert.match(src, /meal\.mealType\s*\?\?\s*meal\.meal_type/);
    assert.match(src, /meal\.servingDate\s*\?\?\s*meal\.serving_date/);
  });
});
