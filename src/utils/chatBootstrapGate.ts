export type ChatBodyMode = 'loading' | 'empty' | 'messages';

/** Decide chat main body while history may still be hydrating. */
export function resolveChatBodyMode(
  isBootstrapping: boolean,
  messageCount: number,
): ChatBodyMode {
  if (isBootstrapping) return 'loading';
  if (messageCount === 0) return 'empty';
  return 'messages';
}

/** Header "New Chat" only after hydrate confirms zero messages. */
export function resolveChatHeaderIsNewChat(
  isBootstrapping: boolean,
  messageCount: number,
): boolean {
  if (isBootstrapping) return false;
  return messageCount === 0;
}
