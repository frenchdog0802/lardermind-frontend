import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyChatResume, readInterruptId } from './resumeOutcome.ts';

describe('classifyChatResume', () => {
    it('treats data.expired as an expired approval', () => {
        assert.deepEqual(
            classifyChatResume({
                success: true,
                data: { type: 'text', data: { expired: true, interruptId: 'int-1' } },
            }),
            { kind: 'expired' },
        );
    });

    it('maps each resume error code', () => {
        const codes = [
            'interrupt_mismatch',
            'resume_in_progress',
            'tool_args_invalid',
            'target_missing',
            'no_pending_action',
        ] as const;
        for (const code of codes) {
            assert.equal(classifyChatResume({ success: false, code }).kind, code);
        }
    });

    it('keeps a follow-up interrupt distinct from a finished turn', () => {
        assert.equal(
            classifyChatResume({
                success: true,
                data: { type: 'interrupt', data: { interruptId: 'int-2' } },
            }).kind,
            'interrupt',
        );
        assert.equal(
            classifyChatResume({
                success: true,
                data: { type: 'pantry_updated', data: {} },
            }).kind,
            'ok',
        );
    });

    it('falls back when the code is unknown', () => {
        assert.equal(classifyChatResume({ success: false, code: 'internal_error' }).kind, 'failed');
    });
});

describe('readInterruptId', () => {
    it('returns a trimmed id and ignores blanks', () => {
        assert.equal(readInterruptId({ interruptId: '  abc  ' }), 'abc');
        assert.equal(readInterruptId({ interruptId: '   ' }), undefined);
        assert.equal(readInterruptId(null), undefined);
    });
});
