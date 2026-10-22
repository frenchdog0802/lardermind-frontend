import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ShoppingListItem } from './types.ts';
import {
    createIdempotencyKey,
    idempotencyHeaders,
    mergeShoppingWrite,
    parseShoppingListItem,
    readShoppingVersion,
    readShoppingVersionConflict,
    shoppingDeletePath,
    shoppingUpdateBody,
} from './shoppingSync.ts';

function item(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
    return {
        id: 'milk',
        name: 'Milk',
        quantity: 1,
        unit: 'L',
        checked: false,
        version: 1,
        ...overrides,
    };
}

describe('shopping version and idempotency helpers', () => {
    it('reads version from the item or details.version', () => {
        assert.equal(readShoppingVersion({ version: 3 }), 3);
        assert.equal(readShoppingVersion({ details: { version: 4 } }), 4);
        assert.equal(readShoppingVersion({ version: '2' }), 2);
        assert.equal(readShoppingVersion({}), undefined);
    });

    it('sends expected version on update and delete only when known', () => {
        assert.deepEqual(shoppingUpdateBody(item({ quantity: 2, version: 3 })), {
            name: 'Milk',
            version: 3,
            details: { quantity: 2, unit: 'L', checked: false },
        });
        assert.equal('version' in shoppingUpdateBody(item({ version: undefined })), false);
        assert.equal(shoppingDeletePath('milk', 3), '/api/shopping-list/milk?version=3');
        assert.equal(shoppingDeletePath('milk'), '/api/shopping-list/milk');
    });

    it('builds an Idempotency-Key header in the allowed charset', () => {
        const key = createIdempotencyKey();
        assert.match(key, /^[A-Za-z0-9._:-]{1,128}$/);
        assert.deepEqual(idempotencyHeaders('retry-1'), { 'Idempotency-Key': 'retry-1' });
    });

    it('parses version onto the shopping item', () => {
        const parsed = parseShoppingListItem({
            id: 'milk',
            name: 'Milk',
            quantity: 1,
            unit: 'L',
            checked: false,
            version: 2,
            details: { quantity: 1, unit: 'L', checked: false, version: 2 },
        });
        assert.equal(parsed?.version, 2);
    });

    it('reads the current row from a version_conflict body', () => {
        const current = readShoppingVersionConflict({
            success: false,
            code: 'version_conflict',
            data: {
                current: {
                    id: 'milk',
                    name: 'Milk',
                    quantity: 4,
                    unit: 'L',
                    checked: false,
                    version: 3,
                },
            },
        });
        assert.equal(current?.version, 3);
        assert.equal(current?.quantity, 4);
        assert.equal(
            readShoppingVersionConflict({ success: true, data: { id: 'milk' } }),
            null,
        );
    });
});

describe('mergeShoppingWrite', () => {
    it('reapplies a field the server did not change and keeps the current version', () => {
        const previous = item({ quantity: 1, checked: false, version: 2 });
        const intended = item({ quantity: 2, checked: false, version: 2 });
        const current = item({ quantity: 1, checked: true, version: 5 });
        const merged = mergeShoppingWrite(previous, intended, current);
        assert.equal(merged.action, 'send');
        assert.equal(merged.item.quantity, 2);
        assert.equal(merged.item.checked, true);
        assert.equal(merged.item.version, 5);
    });

    it('keeps the server row when the intended edit is already there', () => {
        const previous = item({ checked: false, version: 1 });
        const intended = item({ checked: true, version: 1 });
        const current = item({ checked: true, version: 2 });
        const merged = mergeShoppingWrite(previous, intended, current);
        assert.deepEqual(merged, { action: 'keep', item: current });
    });

    it('reports a conflict when the same field changed both places', () => {
        const previous = item({ quantity: 1, version: 1 });
        const intended = item({ quantity: 2, version: 1 });
        const current = item({ quantity: 9, name: 'Oat milk', version: 4 });
        const merged = mergeShoppingWrite(previous, intended, current);
        assert.deepEqual(merged, { action: 'conflict', item: current });
    });
});
