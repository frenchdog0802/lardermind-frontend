import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCwIcon, SendIcon } from 'lucide-react';
import { auth } from '../api/api-auth';
import {
  chatApi,
  type ChatResponse,
  type PendingToolSummary,
} from '../api/chat';
import {
  readGuestToken,
  writeGuestToken,
} from '../utils/guestSession';

interface GuestChatBoxProps {
  onGetStarted: () => void;
  showHeader?: boolean;
  size?: 'default' | 'large';
  className?: string;
}

interface GuestMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: string;
}

function renderContent(content: string, variant: 'user' | 'assistant') {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong
          key={index}
          className={variant === 'user' ? 'font-semibold' : 'font-semibold text-ink'}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part.split('\n').map((line, lineIndex, lines) => (
      <span key={`${index}-${lineIndex}`}>
        {line}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    ));
  });
}

export function GuestChatBox({
  onGetStarted,
  showHeader = true,
  size = 'default',
  className = '',
}: GuestChatBoxProps) {
  const { t, i18n } = useTranslation();
  const [guestToken, setGuestToken] = useState<string | null>(() => readGuestToken());
  const [mintError, setMintError] = useState<string | null>(null);
  const [minting, setMinting] = useState(!readGuestToken());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GuestMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: t('ai.guestWelcome'),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<{
    sessionId: string;
    pendingTools: PendingToolSummary[];
  } | null>(null);
  const [showSaveCta, setShowSaveCta] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = useMemo(() => {
    const cards = t('ai.suggestedPromptCards', { returnObjects: true });
    if (Array.isArray(cards)) {
      return (cards as { title: string; prompt: string }[]).slice(0, 2);
    }
    return [];
  }, [t, i18n.language]);

  const authOpts = useMemo(
    () => (guestToken ? { bearerToken: guestToken } : undefined),
    [guestToken],
  );

  useEffect(() => {
    let cancelled = false;
    async function ensureGuest() {
      setMinting(true);
      try {
        let token = readGuestToken();
        if (!token) {
          const res = await auth.mintGuest();
          if (cancelled) return;
          if (!res.success || !res.data?.token) {
            setMintError(res.message || t('ai.guestMintFailed'));
            return;
          }
          token = res.data.token;
          writeGuestToken(token);
        }
        setGuestToken(token);
        setMintError(null);
        const sessionRes = await chatApi.createSession(undefined, {
          bearerToken: token,
        });
        if (!cancelled && sessionRes.success && sessionRes.data?.id) {
          setSessionId(sessionRes.data.id);
        }
      } catch {
        if (!cancelled) {
          setMintError(t('ai.guestMintFailed'));
        }
      } finally {
        if (!cancelled) setMinting(false);
      }
    }
    void ensureGuest();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
  }, [messages, isTyping, pendingApproval]);

  const applyAssistantResponse = useCallback((response: ChatResponse) => {
    const assistantId = `assistant-${Date.now()}`;
    if (response.type === 'interrupt') {
      const tools = (response.data?.pendingTools as PendingToolSummary[] | undefined) ?? [];
      const sid =
        (response.data?.sessionId as string | undefined) ?? sessionId ?? '';
      if (sid) setSessionId(sid);
      setPendingApproval({ sessionId: sid, pendingTools: tools });
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: response.message || 'Approval required before applying changes.',
          type: 'interrupt',
        },
      ]);
      return;
    }
    setPendingApproval(null);
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: response.message || '',
        type: response.type,
      },
    ]);
    if (response.type === 'meal_suggestions') {
      setShowSaveCta(true);
    }
  }, [sessionId]);

  const runExchange = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || isTyping || !guestToken || minting) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: trimmed },
    ]);
    setInputValue('');
    setIsTyping(true);
    setPendingApproval(null);

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', type: 'streaming' },
    ]);

    try {
      await chatApi.streamSend(
        { message: trimmed, sessionId: sessionId ?? undefined },
        {
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + token } : m,
              ),
            );
          },
          onStatus: () => undefined,
          onInterrupt: (response) => {
            const tools =
              (response.data?.pendingTools as PendingToolSummary[] | undefined) ?? [];
            const sid =
              (response.data?.sessionId as string | undefined) ?? sessionId ?? '';
            if (sid) setSessionId(sid);
            setPendingApproval({ sessionId: sid, pendingTools: tools });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content:
                        response.message ||
                        'Approval required before applying changes.',
                      type: 'interrupt',
                    }
                  : m,
              ),
            );
          },
          onDone: (response) => {
            if (response.data?.sessionId && typeof response.data.sessionId === 'string') {
              setSessionId(response.data.sessionId);
            }
            if (response.type === 'interrupt') {
              const tools =
                (response.data?.pendingTools as PendingToolSummary[] | undefined) ??
                [];
              const sid =
                (response.data?.sessionId as string | undefined) ?? sessionId ?? '';
              if (sid) setSessionId(sid);
              setPendingApproval({ sessionId: sid, pendingTools: tools });
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: response.message || m.content,
                      type: response.type,
                    }
                  : m,
              ),
            );
            if (response.type === 'meal_suggestions') {
              setShowSaveCta(true);
            }
          },
          onError: (message) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content:
                        message ||
                        'Something went wrong. Please try again.',
                      type: 'error',
                    }
                  : m,
              ),
            );
          },
        },
        undefined,
        authOpts,
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleResume = async (decision: 'approve' | 'reject') => {
    if (!pendingApproval?.sessionId || !guestToken || isTyping) return;
    setIsTyping(true);
    try {
      const res = await chatApi.resume(
        { sessionId: pendingApproval.sessionId, decision },
        authOpts,
      );
      setPendingApproval(null);
      if (res.success && res.data) {
        applyAssistantResponse(res.data);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: res.message || 'Could not complete that action.',
            type: 'error',
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: 'Could not complete that action.',
          type: 'error',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runExchange(inputValue);
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: t('ai.guestWelcome'),
      },
    ]);
    setInputValue('');
    setIsTyping(false);
    setPendingApproval(null);
    setShowSaveCta(false);
    setSessionId(null);
  };

  const chatHeightClass =
    size === 'large' ? 'min-h-[440px] max-h-[520px]' : 'min-h-[360px] max-h-[420px]';

  const busy = isTyping || minting || !guestToken;

  return (
    <div className={`w-full ${className}`}>
      {showHeader && (
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-sm font-medium text-ink">{t('ai.guestTryTitle')}</p>
          <span className="rounded-full bg-sage/60 px-2.5 py-0.5 text-xs font-medium text-herb-deep">
            {t('ai.guestBadge')}
          </span>
        </div>
      )}

      <div
        className={`flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-md ${chatHeightClass}`}
      >
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {mintError && (
              <div className="rounded-xl border border-line bg-sage/30 px-3 py-2 text-sm text-ink">
                {mintError}{' '}
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="font-medium text-herb underline-offset-2 hover:underline"
                >
                  {t('ai.guestSignUpInstead')}
                </button>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex animate-fade-up ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-herb text-white'
                      : 'border border-line bg-sage/40 text-ink'
                  }`}
                >
                  {message.content
                    ? renderContent(message.content, message.role)
                    : isTyping && message.type === 'streaming'
                      ? null
                      : null}
                </div>
              </div>
            ))}

            {isTyping && messages[messages.length - 1]?.content === '' && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-line bg-sage/40 px-4 py-3">
                  <div className="flex space-x-1.5">
                    <span className="h-2 w-2 animate-typing-dot rounded-full bg-muted/70 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-typing-dot rounded-full bg-muted/70 [animation-delay:120ms]" />
                    <span className="h-2 w-2 animate-typing-dot rounded-full bg-muted/70 [animation-delay:240ms]" />
                  </div>
                </div>
              </div>
            )}

            {pendingApproval && (
              <div className="rounded-xl border border-line bg-surface p-3">
                <p className="text-sm font-medium text-ink">{t('ai.guestApproveTitle')}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  {pendingApproval.pendingTools.map((tool, index) => (
                    <li key={`${tool.name}-${index}`}>
                      <span className="font-medium text-ink">{tool.name}</span>
                      {tool.argsSummary ? ` — ${tool.argsSummary}` : ''}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={isTyping}
                    onClick={() => void handleResume('approve')}
                    className="flex-1 rounded-lg bg-herb py-2 text-sm text-white disabled:opacity-50"
                  >
                    {t('ai.guestApprove')}
                  </button>
                  <button
                    type="button"
                    disabled={isTyping}
                    onClick={() => void handleResume('reject')}
                    className="flex-1 rounded-lg bg-sage/40 py-2 text-sm text-ink disabled:opacity-50"
                  >
                    {t('ai.guestReject')}
                  </button>
                </div>
              </div>
            )}

            {showSaveCta && (
              <div className="rounded-xl border border-herb/30 bg-sage/50 p-3 text-center">
                <p className="text-sm text-ink">{t('ai.guestSavePrompt')}</p>
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="mt-2 rounded-lg bg-herb px-4 py-2 text-sm font-medium text-white"
                >
                  {t('ai.guestSaveCta')}
                </button>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-line p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={isTyping}
              className="rounded-full p-2 text-muted transition-colors hover:bg-sage/50 hover:text-ink disabled:opacity-50"
              title={t('ai.guestReset')}
              aria-label={t('ai.guestReset')}
            >
              <RefreshCwIcon size={18} />
            </button>
            <div className="relative flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder={t('ai.placeholder')}
                className="w-full rounded-xl border border-line px-4 py-2.5 pr-11 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-herb/30"
                disabled={busy}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || busy}
                aria-label="Send message"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-herb hover:text-herb-deep disabled:text-muted"
              >
                <SendIcon size={18} />
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {suggestedPrompts.map((card) => (
              <button
                key={card.title}
                type="button"
                onClick={() => void runExchange(card.prompt)}
                disabled={busy}
                className="rounded-full bg-sage/40 px-3 py-1 text-left text-xs text-ink transition-colors hover:bg-sage/60 disabled:opacity-50"
              >
                {card.title}
              </button>
            ))}
          </div>

          <p className="mt-3 text-center text-xs text-muted">
            {t('ai.guestFooter')}{' '}
            <button
              type="button"
              onClick={onGetStarted}
              className="font-medium text-herb underline-offset-2 hover:underline"
            >
              {t('ai.guestSaveCta')}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
