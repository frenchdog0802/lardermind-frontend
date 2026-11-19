import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveChatBodyMode,
  resolveChatHeaderIsNewChat,
} from './chatBootstrapGate.ts';

describe('resolveChatBodyMode', () => {
  it('prefers loading while bootstrapping even if messages are empty', () => {
    assert.equal(resolveChatBodyMode(true, 0), 'loading');
  });

  it('shows empty only after bootstrap with zero messages', () => {
    assert.equal(resolveChatBodyMode(false, 0), 'empty');
  });

  it('shows messages after bootstrap when history exists', () => {
    assert.equal(resolveChatBodyMode(false, 3), 'messages');
  });

  it('does not treat bootstrapping + pending empty as empty', () => {
    assert.notEqual(resolveChatBodyMode(true, 0), 'empty');
  });
});

describe('resolveChatHeaderIsNewChat', () => {
  it('is false while bootstrapping', () => {
    assert.equal(resolveChatHeaderIsNewChat(true, 0), false);
  });

  it('is true only for a loaded empty chat', () => {
    assert.equal(resolveChatHeaderIsNewChat(false, 0), true);
    assert.equal(resolveChatHeaderIsNewChat(false, 1), false);
  });
});
