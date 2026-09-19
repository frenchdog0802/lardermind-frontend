import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { greetingPeriodForHour } from './chatGreeting.ts';

describe('greetingPeriodForHour', () => {
  it('returns morning for 5–11', () => {
    assert.equal(greetingPeriodForHour(5), 'morning');
    assert.equal(greetingPeriodForHour(11), 'morning');
  });

  it('returns afternoon for 12–17', () => {
    assert.equal(greetingPeriodForHour(12), 'afternoon');
    assert.equal(greetingPeriodForHour(17), 'afternoon');
  });

  it('returns evening otherwise', () => {
    assert.equal(greetingPeriodForHour(18), 'evening');
    assert.equal(greetingPeriodForHour(0), 'evening');
    assert.equal(greetingPeriodForHour(4), 'evening');
  });
});
