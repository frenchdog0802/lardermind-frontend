import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { splitInstructionSteps } from './recipeSteps.ts';

describe('splitInstructionSteps', () => {
  it('splits newline-separated text into separate steps', () => {
    assert.deepEqual(splitInstructionSteps('Boil water\nAdd pasta\r\nDrain'), [
      'Boil water',
      'Add pasta',
      'Drain',
    ]);
  });

  it('splits array entries that contain embedded newlines', () => {
    assert.deepEqual(splitInstructionSteps(['Chop onion\nFry it', 'Serve']), [
      'Chop onion',
      'Fry it',
      'Serve',
    ]);
  });

  it('drops blank lines and existing numbering prefixes', () => {
    assert.deepEqual(splitInstructionSteps('1. Mix\n\n2) Bake\nStep 3: Cool'), [
      'Mix',
      'Bake',
      'Cool',
    ]);
  });

  it('keeps quantities that merely start a sentence', () => {
    assert.deepEqual(splitInstructionSteps('2 cups flour into a bowl'), ['2 cups flour into a bowl']);
  });

  it('returns an empty list for non-text input', () => {
    assert.deepEqual(splitInstructionSteps(undefined), []);
    assert.deepEqual(splitInstructionSteps(''), []);
  });
});
