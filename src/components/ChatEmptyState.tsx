import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/authContext';
import { usePantry } from '../contexts/pantryContext';
import { greetingPeriodNow } from '../utils/chatGreeting';

export type SuggestedPromptCard = {
  title: string;
  prompt: string;
};

interface ChatEmptyStateProps {
  /** Override clock for tests */
  now?: Date;
  suggestedPromptCards?: SuggestedPromptCard[];
  onSelectPrompt?: (prompt: string) => void;
  onViewPantry?: () => void;
  onViewShoppingList?: () => void;
}

export function ChatEmptyState({
  now,
  suggestedPromptCards = [],
  onSelectPrompt,
  onViewPantry,
  onViewShoppingList,
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
  const headline = displayName
    ? t('ai.greetingHi', { name: displayName })
    : t(greetingKey);

  const pantryCount = Array.isArray(pantryItems) ? pantryItems.length : 0;
  const buyCount = (Array.isArray(shoppingList) ? shoppingList : []).filter(
    (item) => !item.checked,
  ).length;

  const cards = suggestedPromptCards.filter(
    (card) =>
      card &&
      typeof card.title === 'string' &&
      card.title.trim() &&
      typeof card.prompt === 'string' &&
      card.prompt.trim(),
  );

  return (
    <div className="h-full min-h-[14rem] flex flex-col items-center justify-center px-6 py-6 text-center">
      <h2 className="font-display text-2xl font-semibold text-ink">{headline}</h2>

      {(onViewPantry || onViewShoppingList) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {onViewPantry ? (
            <button
              type="button"
              onClick={onViewPantry}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink hover:bg-sage/50 transition-colors"
            >
              {t('ai.chipPantry', { count: pantryCount })}
            </button>
          ) : null}
          {onViewShoppingList ? (
            <button
              type="button"
              onClick={onViewShoppingList}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink hover:bg-sage/50 transition-colors"
            >
              {t('ai.chipBuy', { count: buyCount })}
            </button>
          ) : null}
        </div>
      )}

      {cards.length > 0 && onSelectPrompt ? (
        <div
          className="mt-6 grid w-full max-w-md grid-cols-2 gap-2"
          data-testid="chat-empty-suggestions"
        >
          {cards.map((card) => (
            <button
              key={card.prompt}
              type="button"
              onClick={() => onSelectPrompt(card.prompt)}
              className="min-h-[3.25rem] rounded-xl border border-line bg-sage/30 px-3 py-3 text-left text-sm font-medium text-ink hover:bg-sage/50 transition-colors"
            >
              <span className="line-clamp-2">{card.title}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
