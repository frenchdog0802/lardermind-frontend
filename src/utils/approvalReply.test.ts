import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseTypedApprovalReply } from './approvalReply.ts';

describe('parseTypedApprovalReply', () => {
  it('approves natural affirmatives', () => {
    for (const text of ['yes', 'yes, save it', 'Yes please', 'ok', 'approve', 'save it', '好', '好的', '確認', '好，謝謝']) {
      assert.equal(parseTypedApprovalReply(text), 'approve', text);
    }
  });

  it('rejects natural negatives', () => {
    for (const text of ['no', 'No thanks', 'cancel', 'reject', "don't save it", '不要', '取消', '不用了']) {
      assert.equal(parseTypedApprovalReply(text), 'reject', text);
    }
  });

  it('returns null for mixed or unrelated text', () => {
    for (const text of ['no, save it', 'yes but make it 3', 'add milk too', 'what can I cook?', '', '   ']) {
      assert.equal(parseTypedApprovalReply(text), null, text);
    }
  });
});
