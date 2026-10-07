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
