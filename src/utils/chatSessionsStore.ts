import { chatApi, type ChatSession } from '../api/chat';
import { createDedupedFetcher } from './dedupedFetch';

/**
 * One shared chat-sessions list (AppDrawer Recents + AICookingAssistant header/bootstrap).
 * Reads go through an in-flight dedup + 30 s TTL; writes after a mutation use `force`.
 */
let sessions: ChatSession[] = [];
let ownerToken: string | null = null;
const listeners = new Set<() => void>();

function currentToken(): string {
  try {
    return localStorage.getItem('jwt') ?? '';
  } catch {
    return '';
  }
}

function emit() {
  listeners.forEach((l) => l());
}

const fetcher = createDedupedFetcher(async () => {
  const res = await chatApi.listSessions();
  if (res.success === false) throw new Error(res.message || 'Failed to load chat sessions');
  const list = res.data?.sessions ?? [];
  sessions = list;
  emit();
  return list;
});

export const chatSessionsStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): ChatSession[] {
    return sessions;
  },
  /** Deduped/TTL-cached fetch. Never serves another account's cached list. */
  fetch(opts?: { force?: boolean }): Promise<ChatSession[]> {
    const token = currentToken();
    if (ownerToken !== token) {
      ownerToken = token;
      fetcher.invalidate();
      if (sessions.length) {
        sessions = [];
        emit();
      }
    }
    return fetcher.run({ force: opts?.force === true });
  },
  /** Local optimistic edit (title events, new session placeholder). */
  update(updater: (prev: ChatSession[]) => ChatSession[]) {
    sessions = updater(sessions);
    emit();
  },
};
