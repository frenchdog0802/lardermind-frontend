/** Detect AI quota / guest chat rate-limit errors from API messages. */
export function isQuotaExceededMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('quota exceeded') ||
    m.includes('ai message quota') ||
    m.includes('guest_chat_rate_limited') ||
    m.includes('guest chat rate limit') ||
    m.includes('rate limit exceeded')
  );
}
