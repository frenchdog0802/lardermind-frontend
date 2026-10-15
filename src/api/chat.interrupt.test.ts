import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('web chat SSE interrupt terminal', () => {
  it('marks onInterrupt as a terminal event so stream end does not call onError', () => {
    const src = readFileSync(join(root, 'src/api/chat.ts'), 'utf8');
    assert.match(
      src,
      /onInterrupt:\s*\([^)]*\)\s*=>\s*\{[\s\S]*?receivedTerminalEvent\s*=\s*true/,
      'consumeSseStream must set receivedTerminalEvent on interrupt',
    );
  });
});

describe('web chat clientLocalDate', () => {
  it('attaches device local calendar date on send and stream', () => {
    const src = readFileSync(join(root, 'src/api/chat.ts'), 'utf8');
    assert.match(src, /function localCalendarDate\(/);
    assert.match(src, /withClientLocalDate\(data\)/);
    assert.match(src, /clientLocalDate/);
  });
});

describe('web HITL approve inline in transcript', () => {
  it('does not dock Approve banner under AppHeader outside the message list', () => {
    const src = readFileSync(join(root, 'src/components/AICookingAssistant.tsx'), 'utf8');
    assert.doesNotMatch(
      src,
      /AppHeader[\s\S]{0,400}\{pendingApproval && \(/,
      'Approve UI must not sit immediately under AppHeader as a docked banner',
    );
    assert.match(
      src,
      /message\.type === 'interrupt' && pendingApproval && renderPendingApprovalCard\(\)/,
      'Approve UI must render on the interrupt message in the transcript',
    );
  });
});

describe('web HITL pending must stay actionable', () => {
  it('does not clear pendingApproval at the start of generateResponse / stream send', () => {
    const src = readFileSync(join(root, 'src/components/AICookingAssistant.tsx'), 'utf8');
    // Clearing at stream start drops Approve UI while D1 pending remains.
    assert.doesNotMatch(
      src,
      /setIsTyping\(true\);\s*setPendingApproval\(null\);/,
      'must not clear pendingApproval when starting a new chat stream',
    );
  });

  it('disables composer send while pendingApproval is set', () => {
    const src = readFileSync(join(root, 'src/components/AICookingAssistant.tsx'), 'utf8');
    assert.match(
      src,
      /disabled=\{isTyping\s*\|\|\s*Boolean\(pendingApproval\)\}/,
      'composer must block send while HITL approval is pending (mobile parity)',
    );
  });

  it('restores pendingApproval from history pendingInterrupt', () => {
    const src = readFileSync(join(root, 'src/components/AICookingAssistant.tsx'), 'utf8');
    assert.match(
      src,
      /pendingInterrupt/,
      'history load must read pendingInterrupt to restore Approve UI',
    );
    const apiSrc = readFileSync(join(root, 'src/api/chat.ts'), 'utf8');
    assert.match(
      apiSrc,
      /pendingInterrupt/,
      'chatApi.getHistory types must include pendingInterrupt',
    );
  });
});
