/**
 * Detect a typed yes/no reply while an Approve/Reject card is pending.
 * Keep in sync with isAffirmativeReply / isNegativeReply in the backend
 * (agent/tools/mutating-intent.ts). Only whole-message matches count, so
 * mixed text such as "no, save it" is neither approve nor reject.
 */
const REPLY_SEP = '[\\s,，、.!！。?？~]*';

function buildReplyRegex(core: string, filler: string): RegExp {
  return new RegExp(
    `^${REPLY_SEP}(?:${core})(?:${REPLY_SEP}(?:${core}|${filler}))*${REPLY_SEP}$`,
    'iu',
  );
}

const REPLY_FILLER =
  'please|thanks|thank you|thx|it|them|that|this|now|all|these|those|changes|for me|吧|喔|哦|啦|了|謝謝|謝了|請|一下|它|這個|那個|全部';

const AFFIRMATIVE_RE = buildReplyRegex(
  'yes|yeah|yep|yup|y|sure|ok|okay|go ahead|go for it|do it|save|add|confirm|confirmed|approve|approved|accept|apply|proceed|sounds good|looks good|lgtm|correct|right|好|好的|好啊|好喔|可以|要|是|是的|對|沒問題|確認|確定|儲存|保存|加入|新增|同意|批准|執行|沒錯',
  REPLY_FILLER,
);

const NEGATIVE_RE = buildReplyRegex(
  "no|nope|nah|n|cancel|reject|rejected|decline|deny|discard|skip|stop|never\\s*mind|not now|don['’]?t(?:\\s+(?:save|add|do))?|do not(?:\\s+(?:save|add|do))?|不要|不用|不必|不|否|取消|拒絕|拒绝|算了|別|别|先不要|不好|不可以|不行|不需要",
  REPLY_FILLER,
);

export type TypedApprovalDecision = 'approve' | 'reject';

export function parseTypedApprovalReply(text: string): TypedApprovalDecision | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 60) return null;
  if (AFFIRMATIVE_RE.test(trimmed)) return 'approve';
  if (NEGATIVE_RE.test(trimmed)) return 'reject';
  return null;
}
