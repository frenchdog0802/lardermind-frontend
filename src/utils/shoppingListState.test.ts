import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    INFO_TOAST_MS,
    UNDO_TOAST_MS,
    shoppingBuyCount,
    shoppingEmptyState,
} from './shoppingListState.ts';
import { buyChipCount } from './chatEmptyChipCounts.ts';

describe('undo toast duration', () => {
    it('is about 8 seconds and longer than info toasts', () => {
        assert.equal(UNDO_TOAST_MS, 8000);
        assert.ok(UNDO_TOAST_MS > INFO_TOAST_MS);
    });
});

describe('shoppingEmptyState', () => {
    it('shows the list when rows are visible', () => {
        assert.equal(
            shoppingEmptyState({ visibleCount: 2, onListCount: 2, inFlightCount: 0, searchQuery: '' }),
            'list',
        );
    });

    it('is empty only when nothing is on the list and nothing is in flight', () => {
        assert.equal(
            shoppingEmptyState({ visibleCount: 0, onListCount: 0, inFlightCount: 0, searchQuery: '' }),
            'empty',
        );
    });

    it('never says empty mid check-off (request in flight or row still listed)', () => {
        assert.equal(
            shoppingEmptyState({ visibleCount: 0, onListCount: 0, inFlightCount: 1, searchQuery: '' }),
            'in_progress',
        );
        assert.equal(
            shoppingEmptyState({ visibleCount: 0, onListCount: 1, inFlightCount: 0, searchQuery: '' }),
            'in_progress',
        );
    });

    it('reports a search miss separately from an empty list', () => {
        assert.equal(
            shoppingEmptyState({ visibleCount: 0, onListCount: 3, inFlightCount: 0, searchQuery: 'zzz' }),
            'no_match',
        );
    });
});

describe('Buy count', () => {
    const rows = [
        { checked: false, synced_to_pantry: false },
        { checked: true, synced_to_pantry: false }, // checked, pending move to pantry
        { checked: true, synced_to_pantry: true }, // done: left the list
    ];

    it('counts rows still on the list, including a check-off in progress', () => {
        assert.equal(shoppingBuyCount(rows), 2);
        assert.equal(shoppingBuyCount([]), 0);
        assert.equal(shoppingBuyCount(undefined), 0);
    });

    it('chat chip uses the same count as the Shopping page', () => {
        assert.equal(buyChipCount(rows), shoppingBuyCount(rows));
    });
});
