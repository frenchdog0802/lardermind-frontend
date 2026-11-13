import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCwIcon, SendIcon } from 'lucide-react';

interface DemoChatBoxProps {
  onGetStarted: () => void;
  autoPlay?: boolean;
  showHeader?: boolean;
  size?: 'default' | 'large';
  className?: string;
}

interface DemoMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function buildWelcome(content: string): DemoMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    content,
  };
}

function renderContent(content: string, variant: 'user' | 'assistant') {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className={variant === 'user' ? 'font-semibold' : 'font-semibold text-ink'}>
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

export function DemoChatBox({
  onGetStarted,
  autoPlay = true,
  showHeader = true,
  size = 'default',
  className = '',
}: DemoChatBoxProps) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<DemoMessage[]>(() => [
    buildWelcome(t('ai.demoWelcome')),
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = useMemo(() => {
    const prompts = t('ai.demoSuggestedPrompts', { returnObjects: true });
    return Array.isArray(prompts) ? (prompts as string[]) : [];
  }, [t, i18n.language]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [buildWelcome(t('ai.demoWelcome'))];
      }
      return prev;
    });
  }, [i18n.language, t]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Scroll only inside the chat panel — never scroll the page.
    container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
  }, [messages, isTyping]);

  const runExchange = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || isTyping) return;

    const userMessage: DemoMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    await new Promise((resolve) => window.setTimeout(resolve, 900));

    const responses = t('ai.demoResponses', { returnObjects: true });
    const responseMap =
      responses && typeof responses === 'object' && !Array.isArray(responses)
        ? (responses as Record<string, string>)
        : {};
    const response = responseMap[trimmed] ?? t('ai.demoFallback');

    const assistantMessage: DemoMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: response,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  useEffect(() => {
    if (!autoPlay || hasAutoPlayed || suggestedPrompts.length === 0) return;

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAutoPlayed) {
          setHasAutoPlayed(true);
          window.setTimeout(() => {
            void runExchange(suggestedPrompts[0]);
          }, 1200);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(element);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when section enters view
  }, [autoPlay, hasAutoPlayed, suggestedPrompts]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runExchange(inputValue);
  };

  const handleReset = () => {
    setMessages([buildWelcome(t('ai.demoWelcome'))]);
    setInputValue('');
    setIsTyping(false);
  };

  const chatHeightClass =
    size === 'large' ? 'min-h-[440px] max-h-[520px]' : 'min-h-[360px] max-h-[420px]';

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {showHeader && (
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-sm font-medium text-ink">Try the assistant</p>
          <span className="rounded-full bg-sage/60 px-2.5 py-0.5 text-xs font-medium text-herb-deep">
            Demo
          </span>
        </div>
      )}

      <div
        className={`flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-md ${chatHeightClass}`}
      >
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
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
                  {renderContent(message.content, message.role)}
                </div>
              </div>
            ))}

            {isTyping && (
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

          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-line p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={isTyping}
              className="rounded-full p-2 text-muted transition-colors hover:bg-sage/50 hover:text-ink disabled:opacity-50"
              title="Reset demo"
              aria-label="Reset demo chat"
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
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                aria-label="Send message"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-herb hover:text-herb-deep disabled:text-muted"
              >
                <SendIcon size={18} />
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void runExchange(prompt)}
                disabled={isTyping}
                className="rounded-full bg-sage/40 px-3 py-1 text-left text-xs text-ink transition-colors hover:bg-sage/60 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <p className="mt-3 text-center text-xs text-muted">
            This is a demo.{' '}
            <button
              type="button"
              onClick={onGetStarted}
              className="font-medium text-herb underline-offset-2 hover:underline"
            >
              Sign up free
            </button>{' '}
            for the real assistant.
          </p>
        </form>
      </div>
    </div>
  );
}
