import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ShoppingListItem } from '../api/types';
import { planShoppingAdd } from './shoppingAdd.ts';

const row = (o: Partial<ShoppingListItem>): ShoppingListItem =>
    ({ id: '1', name: 'Salt', quantity: 22.5, unit: 'g', checked: false, ...o }) as ShoppingListItem;

describe('planShoppingAdd', () => {
    it('adds to the existing row for the same unit (22.5 g + 100 g = 122.5 g)', () => {
        const p = planShoppingAdd([row({})], { name: ' salt ', quantity: 100, unit: 'g' });
        assert.equal(p.action, 'merge');
        assert.deepEqual(p.action === 'merge' && [p.quantity, p.unit], [122.5, 'g']);
    });
    it('converts compatible units into the row unit', () => {
        const p = planShoppingAdd([row({})], { name: 'Salt', quantity: 1, unit: 'kg' });
        assert.deepEqual(p.action === 'merge' && [p.quantity, p.unit], [1022.5, 'g']);
    });
    it('creates a separate row for incompatible units or checked rows', () => {
        assert.deepEqual(planShoppingAdd([row({})], { name: 'Salt', quantity: 2, unit: 'pcs' }), { action: 'create' });
        assert.deepEqual(planShoppingAdd([row({ checked: true })], { name: 'Salt', quantity: 2, unit: 'g' }), { action: 'create' });
    });
    it('does not merge different count units', () => {
        const list = [row({ name: 'Garlic', quantity: 2, unit: 'clove' })];
        assert.deepEqual(planShoppingAdd(list, { name: 'Garlic', quantity: 1, unit: 'pcs' }), { action: 'create' });
    });
});
