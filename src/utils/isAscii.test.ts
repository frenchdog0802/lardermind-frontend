import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAscii } from './isAscii.ts';

describe('isAscii', () => {
    it('accepts ASCII names and rejects characters above 127', () => {
        assert.equal(isAscii('Milk'), true);
        assert.equal(isAscii(''), true);
        assert.equal(isAscii('牛奶'), false);
    });
});