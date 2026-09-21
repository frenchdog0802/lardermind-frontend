import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/authContext';
import { usePantry } from '../contexts/pantryContext';
import { greetingPeriodNow } from '../utils/chatGreeting';

interface ChatEmptyStateProps {
  /** Override clock for tests */
  now?: Date;
  suggestedPrompts?: string[];
  onSelectPrompt?: (prompt: string) => void;
}

export function ChatEmptyState({
  now,
  suggestedPrompts = [],
  onSelectPrompt,
}: ChatEmptyStateProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { pantryItems, shoppingList } = usePantry();

  const period = greetingPeriodNow(now);
  const greetingKey =
    period === 'morning'
      ? 'ai.greetingMorning'
      : period === 'afternoon'
        ? 'ai.greetingAfternoon'
        : 'ai.greetingEvening';

  const displayName = user?.first_name?.trim() || user?.name?.trim() || '';
  const periodGreeting = t(greetingKey);
  const headline = displayName
    ? t('home.welcomeBack', { name: displayName })
    : periodGreeting;

  const pantryCount = Array.isArray(pantryItems) ? pantryItems.length : 0;
  const buyCount = (Array.isArray(shoppingList) ? shoppingList : []).filter(
    (item) => !item.checked,
  ).length;

  return (
    <div className="h-full min-h-[14rem] flex flex-col items-center justify-center px-6 py-8 text-center">
      <h2 className="font-display text-2xl font-semibold text-ink mb-2">{headline}</h2>
      {displayName ? (
        <p className="font-display text-lg text-ink mb-3">{periodGreeting}</p>
      ) : null}
      <p className="text-muted text-sm sm:text-base max-w-md mb-6">{t('ai.welcome')}</p>
      <div className="space-y-1 text-sm text-muted mb-8">
        <p>{t('home.pantryCount', { count: pantryCount })}</p>
        <p>{t('home.buyCount', { count: buyCount })}</p>
      </div>
      {suggestedPrompts.length > 0 && onSelectPrompt ? (
        <div
          className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center"
          data-testid="chat-empty-suggestions"
        >
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSelectPrompt(prompt)}
              className="w-full sm:w-auto text-sm bg-sage/40 hover:bg-sage/60 text-ink px-4 py-2.5 rounded-full border border-line/60 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
