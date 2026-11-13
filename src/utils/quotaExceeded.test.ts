import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isQuotaExceededMessage } from './quotaExceeded.ts';

describe('isQuotaExceededMessage', () => {
  it('detects AI quota and guest rate limit copy', () => {
    assert.equal(isQuotaExceededMessage('AI message quota exceeded for today'), true);
    assert.equal(isQuotaExceededMessage('Guest chat rate limit exceeded'), true);
    assert.equal(isQuotaExceededMessage('Something else failed'), false);
  });
});
