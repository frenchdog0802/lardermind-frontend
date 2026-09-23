import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LockIcon,
  XIcon,
} from 'lucide-react';
import { usePantry } from '../contexts/pantryContext';
import { chatApi } from '../api/chat';
import type { AppDrawerView } from './AppDrawer';
import {
  SETUP_GUIDE_STEP_ORDER,
  type SetupGuideStepId,
  isSetupGuideStepComplete,
  isSetupGuideStepLocked,
  markSetupGuideChatStarted,
  readSetupGuideChatStarted,
  readSetupGuideDismissed,
  writeSetupGuideDismissed,
} from '../utils/setupGuide';

interface SetupGuideProps {
  onNavigate: (view: AppDrawerView) => void;
  onAskAi: (prompt: string) => void;
}

export function SetupGuide({ onNavigate, onAskAi }: SetupGuideProps) {
  const { t } = useTranslation();
  const { pantryItems, recipes, mealPlan, shoppingList } = usePantry();
  const [dismissed, setDismissed] = useState(readSetupGuideDismissed);
  const [chatStarted, setChatStarted] = useState(readSetupGuideChatStarted);
  const [expanded, setExpanded] = useState<SetupGuideStepId | null>('pantry');

  const refreshChatFlag = useCallback(async () => {
    if (readSetupGuideChatStarted()) {
      setChatStarted(true);
      return;
    }
    try {
      const res = await chatApi.listSessions();
      const sessions = res.data?.sessions ?? [];
      const started = sessions.some((s) => Boolean(s.title?.trim()));
      if (started) {
        markSetupGuideChatStarted();
        setChatStarted(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshChatFlag();
  }, [refreshChatFlag]);

  const counts = useMemo(
    () => ({
      pantry: Array.isArray(pantryItems) ? pantryItems.length : 0,
      recipes: Array.isArray(recipes) ? recipes.length : 0,
      chatStarted,
      meals: Array.isArray(mealPlan) ? mealPlan.length : 0,
      shopping: Array.isArray(shoppingList) ? shoppingList.length : 0,
    }),
    [pantryItems, recipes, chatStarted, mealPlan, shoppingList],
  );

  const completed = useMemo(() => {
    const map = {} as Record<SetupGuideStepId, boolean>;
    for (const id of SETUP_GUIDE_STEP_ORDER) {
      map[id] = isSetupGuideStepComplete(id, counts);
    }
    return map;
  }, [counts]);

  const doneCount = SETUP_GUIDE_STEP_ORDER.filter((id) => completed[id]).length;
  const allDone = doneCount === SETUP_GUIDE_STEP_ORDER.length;
  const progressPct = Math.round((doneCount / SETUP_GUIDE_STEP_ORDER.length) * 100);

  useEffect(() => {
    if (allDone) return;
    const firstIncomplete = SETUP_GUIDE_STEP_ORDER.find((id) => !completed[id]);
    if (firstIncomplete && !isSetupGuideStepLocked(firstIncomplete, completed)) {
      setExpanded((prev) => {
        if (prev && !completed[prev] && !isSetupGuideStepLocked(prev, completed)) {
          return prev;
        }
        return firstIncomplete;
      });
    }
  }, [completed, allDone]);

  if (dismissed) return null;

  const dismiss = () => {
    writeSetupGuideDismissed();
    setDismissed(true);
  };

  const toggle = (id: SetupGuideStepId) => {
    if (isSetupGuideStepLocked(id, completed)) return;
    setExpanded((prev) => (prev === id ? null : id));
  };

  const cookPrompt = t('ai.emptyPrompts.cook');
  const planPrompt = t('ai.emptyPrompts.calendar');

  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface shadow-lg overflow-hidden"
      role="complementary"
      aria-label={t('setupGuide.title')}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <h2 className="font-display text-base font-semibold text-ink">
          {t('setupGuide.title')}
        </h2>
        <button
          type="button"
          onClick={dismiss}
          className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-sage/50 transition-colors"
          aria-label={t('common.close')}
        >
          <XIcon size={18} />
        </button>
      </div>

      <div className="px-4 pb-3">
        <div className="h-1.5 rounded-full bg-sage/60 overflow-hidden" aria-hidden>
          <div
            className="h-full rounded-full bg-herb transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {allDone
            ? t('setupGuide.allDone')
            : t('setupGuide.progress', { done: doneCount, total: SETUP_GUIDE_STEP_ORDER.length })}
        </p>
      </div>

      <ul className="px-2 pb-3 space-y-1 max-h-[min(28rem,55vh)] overflow-y-auto">
        {SETUP_GUIDE_STEP_ORDER.map((id) => {
          const locked = isSetupGuideStepLocked(id, completed);
          const done = completed[id];
          const isOpen = expanded === id && !locked;

          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => toggle(id)}
                disabled={locked}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  isOpen ? 'bg-sage/40' : locked ? 'opacity-60' : 'hover:bg-sage/30'
                }`}
                aria-expanded={isOpen}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    done ? 'bg-herb text-white' : 'border border-line bg-surface'
                  }`}
                >
                  {done ? <CheckIcon size={12} strokeWidth={3} /> : null}
                </span>
                <span className={`flex-1 text-sm font-medium ${done ? 'text-ink' : 'text-ink'}`}>
                  {t(`setupGuide.steps.${id}.title`)}
                </span>
                {locked ? (
                  <LockIcon size={16} className="text-muted shrink-0" />
                ) : isOpen ? (
                  <ChevronUpIcon size={16} className="text-muted shrink-0" />
                ) : (
                  <ChevronDownIcon size={16} className="text-muted shrink-0" />
                )}
              </button>

              {isOpen ? (
                <div className="px-3 pb-3 pt-1 space-y-2">
                  <p className="text-xs text-muted leading-relaxed">
                    {t(`setupGuide.steps.${id}.body`)}
                  </p>
                  {id === 'pantry' && (
                    <GuideCta onClick={() => onNavigate('pantryInventory')}>
                      {t('setupGuide.steps.pantry.cta')}
                    </GuideCta>
                  )}
                  {id === 'recipes' && (
                    <GuideCta onClick={() => onNavigate('recipeManager')}>
                      {t('setupGuide.steps.recipes.cta')}
                    </GuideCta>
                  )}
                  {id === 'chat' && (
                    <GuideCta
                      onClick={() => {
                        onAskAi(cookPrompt);
                      }}
                    >
                      {t('setupGuide.steps.chat.cta')}
                    </GuideCta>
                  )}
                  {id === 'meals' && (
                    <div className="flex flex-col gap-2">
                      <GuideCta onClick={() => onNavigate('calendar')}>
                        {t('setupGuide.steps.meals.ctaCalendar')}
                      </GuideCta>
                      <GuideCta
                        secondary
                        onClick={() => {
                          onAskAi(planPrompt);
                        }}
                      >
                        {t('setupGuide.steps.meals.ctaAi')}
                      </GuideCta>
                    </div>
                  )}
                  {id === 'shopping' && (
                    <GuideCta onClick={() => onNavigate('shoppingList')}>
                      {t('setupGuide.steps.shopping.cta')}
                    </GuideCta>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GuideCta({
  children,
  onClick,
  secondary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  secondary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-full py-2 px-3 text-sm font-semibold transition-colors ${
        secondary
          ? 'border border-line bg-linen text-ink hover:bg-sage/40'
          : 'bg-herb text-white hover:bg-herb-deep'
      }`}
    >
      {children}
    </button>
  );
}
