import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { needsFallbackApprovalCard, settleStaleInterrupts } from './interruptMessages.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const RESOLVED = 'That approval was handled.';

const msgs = [
    { id: 'a', type: 'interrupt', content: 'I need your approval before making these changes.' },
    { id: 'b', type: 'text', content: 'hello' },
    { id: 'c', type: 'interrupt', content: 'I need your approval before making these changes.' },
];

describe('settleStaleInterrupts', () => {
    it('keeps only the newest interrupt live while an approval is pending', () => {
        const out = settleStaleInterrupts(msgs, true, RESOLVED);
        assert.equal(out[0]!.type, 'text');
        assert.equal(out[0]!.content, RESOLVED);
        assert.equal(out[2]!.type, 'interrupt');
    });

    it('turns every interrupt into a resolved note when nothing is pending (no bare approval text)', () => {
        const out = settleStaleInterrupts(msgs, false, RESOLVED);
        assert.deepEqual(out.map((m) => m.type), ['text', 'text', 'text']);
        assert.equal(out[2]!.content, RESOLVED);
    });

    it('leaves other messages untouched', () => {
        assert.equal(settleStaleInterrupts(msgs, true, RESOLVED)[1], msgs[1]);
    });
});

describe('needsFallbackApprovalCard', () => {
    it('is true when approval is pending but no interrupt row exists to hold the card', () => {
        assert.equal(needsFallbackApprovalCard([{ id: 'x', type: 'text', content: '' }], true), true);
        assert.equal(needsFallbackApprovalCard(msgs, true), false);
        assert.equal(needsFallbackApprovalCard([], false), false);
    });
});

describe('AICookingAssistant approval wiring', () => {
    const src = readFileSync(join(root, 'src/components/AICookingAssistant.tsx'), 'utf8');

    it('always renders a card for a pending approval and settles stale interrupt rows', () => {
        assert.match(src, /settleStaleInterrupts\(/);
        assert.match(src, /needsFallbackApprovalCard\(/);
    });

    it('re-fetches the pending approval when an interrupt arrives without tool details', () => {
        assert.match(src, /tools\.length === 0[\s\S]{0,120}restorePendingApproval/);
    });

    it('follows a chained approval returned by resume (createRecipe -> planMeals)', () => {
        assert.match(src, /priorCard/);
    });
});
