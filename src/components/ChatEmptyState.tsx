import { useEffect } from 'react';
import { CameraIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/authContext';
import { usePantry } from '../contexts/pantryContext';
import { buyChipCount, pantryChipCount } from '../utils/chatEmptyChipCounts';
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
  /** Opens the photo picker (fridge / groceries / receipt recognition). */
  onSnapFridge?: () => void;
  snapDisabled?: boolean;
}

export function ChatEmptyState({
  now,
  suggestedPromptCards = [],
  onSelectPrompt,
  onViewPantry,
  onViewShoppingList,
  onSnapFridge,
  snapDisabled = false,
}: ChatEmptyStateProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    pantryItems,
    shoppingList,
    fetchAllPantryItems,
    fetchAllShoppingListItems,
  } = usePantry();

  const showChips = Boolean(onViewPantry || onViewShoppingList);

  useEffect(() => {
    if (!showChips) return;
    void fetchAllPantryItems();
    void fetchAllShoppingListItems();
    // Context fetchers are stable and TTL-deduped, so this is cheap when data is fresh.
  }, [showChips, fetchAllPantryItems, fetchAllShoppingListItems]);

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

  const pantryCount = pantryChipCount(pantryItems);
  const buyCount = buyChipCount(shoppingList);

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
      <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink tracking-tight">
        {headline}
      </h2>

      {onSnapFridge ? (
        <button
          type="button"
          onClick={onSnapFridge}
          disabled={snapDisabled}
          data-testid="snap-fridge"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-herb px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-herb-deep disabled:opacity-60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-herb"
        >
          <CameraIcon size={20} aria-hidden="true" />
          {t('ai.snapFridge')}
        </button>
      ) : null}

      {showChips ? (
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
      ) : null}

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
