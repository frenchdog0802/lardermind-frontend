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
    assert.match(src, /withClientContext\(data\)/);
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
      /message\.type === 'interrupt' &&\s*pendingApproval &&\s*message\.id === lastInterruptMessageId &&\s*renderPendingApprovalCard\(\)/,
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

  it('keeps the composer usable while pendingApproval is set and routes typed yes/no to resume', () => {
    const src = readFileSync(join(root, 'src/components/AICookingAssistant.tsx'), 'utf8');
    assert.doesNotMatch(
      src,
      /disabled=\{isTyping\s*\|\|\s*Boolean\(pendingApproval\)/,
      'composer must stay enabled so the user can type yes/no',
    );
    assert.match(src, /parseTypedApprovalReply\(/);
    assert.match(src, /void handleResume\(typed\)/);
    assert.doesNotMatch(
      src,
      /if \(!inputValue\.trim\(\) \|\| isTyping \|\| pendingApproval\) return;/,
      'handleSendMessage must not drop typed text while approval is pending',
    );
  });

  it('guest chat resolves typed yes/no via resume and never clears the card on send', () => {
    const src = readFileSync(join(root, 'src/components/GuestChatBox.tsx'), 'utf8');
    assert.match(src, /parseTypedApprovalReply\(/);
    assert.match(src, /await handleResume\(typed\)/);
    assert.doesNotMatch(
      src,
      /setIsTyping\(true\);\s*setPendingApproval\(null\);/,
      'must not clear pendingApproval when sending a message',
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

  it('sends the shown interruptId and ignores a second click while resume is in flight', () => {
    const src = readFileSync(join(root, 'src/components/AICookingAssistant.tsx'), 'utf8');
    assert.match(src, /resumeLock\.current/, 'resume must be guarded by an in-flight lock');
    assert.match(
      src,
      /disabled=\{resumeInFlight\}/,
      'approve and reject must be disabled while resume is in flight',
    );
    assert.match(
      src,
      /interruptId:\s*approval\.interruptId/,
      'resume must send the interruptId of the card being decided',
    );
    assert.match(src, /ai\.approvalExpired/);
    assert.match(src, /ai\.approvalMismatch/);
    assert.match(src, /ai\.approvalTargetMissing/);
    assert.match(src, /loadHistoryForSession\(approval\.sessionId\)/);
  });
});

describe('web chat session reuse', () => {
  it('parses the server session SSE event and forwards it through the stream wrapper', () => {
    const src = readFileSync(join(root, 'src/api/chat.ts'), 'utf8');
    assert.match(src, /eventName === 'session'[\s\S]{0,200}handlers\.onSession\?\.\(/);
    assert.match(src, /onSession:\s*handlers\.onSession/);
  });

  it('adopts the server session id in the assistant and the guest chat', () => {
    const assistant = readFileSync(join(root, 'src/components/AICookingAssistant.tsx'), 'utf8');
    assert.match(assistant, /onSession:\s*\(sessionId\)\s*=>\s*\{[\s\S]{0,300}setActiveSessionId\(/);
    const guest = readFileSync(join(root, 'src/components/GuestChatBox.tsx'), 'utf8');
    assert.match(guest, /onSession:\s*\(sid\)\s*=>\s*setSessionId\(/);
  });
});
