import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buyChipCount, pantryChipCount } from './chatEmptyChipCounts.ts';

describe('chatEmptyChipCounts', () => {
  it('pantryChipCount uses list length and treats non-arrays as 0', () => {
    assert.equal(pantryChipCount(undefined), 0);
    assert.equal(pantryChipCount(null), 0);
    assert.equal(pantryChipCount([]), 0);
    assert.equal(pantryChipCount([{ id: '1' }, { id: '2' }]), 2);
  });

  it('buyChipCount counts rows still on the list, not ones already moved to the pantry', () => {
    assert.equal(buyChipCount(undefined), 0);
    assert.equal(buyChipCount([]), 0);
    assert.equal(
      buyChipCount([
        { id: 'a', checked: false },
        { id: 'b', checked: true, synced_to_pantry: true },
        { id: 'c' },
        // mid check-off: checked but still listed until it syncs
        { id: 'd', checked: true, synced_to_pantry: false },
      ]),
      3,
    );
  });
});
