import { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SendIcon, ShoppingCartIcon, ChevronRightIcon, XIcon, PlusCircleIcon } from 'lucide-react';
import { usePantry } from '../contexts/pantryContext';
import { chatApi, ChatResponse, ChatSession, HistoryMessage, PendingToolSummary } from '../api/chat';
import { mealPlanApi } from '../api/mealPlan';
import { RecipeSuggestion } from '../api/types';
import ChatMessageContent from './ChatMessageContent';
import { AppHeader } from './AppHeader';
import { ChatEmptyState } from './ChatEmptyState';

interface AICookingAssistantProps {
  /** When false, the view is hidden but stays mounted so streams keep running. */
  isActive?: boolean;
  /** Prefill the composer when navigating from an empty-state CTA. */
  pendingPrompt?: string | null;
  onPendingPromptConsumed?: () => void;
  /** Switch to this session when set from the app drawer. */
  requestedSessionId?: string | null;
  /** Create / focus a blank chat when true. */
  requestNewChat?: boolean;
  onSessionRequestConsumed?: () => void;
  onOpenMenu: () => void;
  onViewRecipe?: (recipeId: string) => void;
  onViewShoppingList?: () => void;
  onViewCalendar?: () => void;
  onViewPantry?: () => void;
}

type MessageType =
  | 'text'
  | 'recipe_created'
  | 'recipe_imported'
  | 'recipe_updated'
  | 'shopping_list_updated'
  | 'meal_plan_updated'
  | 'pantry_updated'
  | 'preferences_updated'
  | 'meal_suggestions'
  | 'multi_action'
  | 'action_result'
  | 'interrupt'
  | 'system'
  | 'confirmation'
  | 'error';

interface ResponseCardData {
  recipeId?: string;
  recipeName?: string;
  ingredientCount?: number;
  steps?: string[];
  sourceUrl?: string;
  imported?: boolean;
  itemsAdded?: number;
  items?: Array<{ name: string; quantity?: string | number; unit?: string }>;
  mealPlanId?: string;
  mealType?: string;
  servingDate?: string;
  mealsScheduled?: number;
  meals?: Array<{ meal_name?: string; serving_date?: string; meal_type?: string }>;
  mergedGroups?: number;
  removedDuplicates?: number;
  suggestions?: Array<{ recipeId?: string; recipeName?: string; matchScore?: number; missingIngredients?: string[] }>;
  actionCount?: number;
  actions?: Array<Record<string, unknown>>;
  message?: string;
  allergies?: string[];
  dislikes?: string[];
  likes?: string[];
  dietaryRestrictions?: string[];
  householdNotes?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  type?: MessageType;
  content: string;
  timestamp: number;
  cardData?: ResponseCardData;
  streaming?: boolean;
  statusText?: string;
}

export function AICookingAssistant({
  isActive = true,
  pendingPrompt = null,
  onPendingPromptConsumed,
  requestedSessionId = null,
  requestNewChat = false,
  onSessionRequestConsumed,
  onOpenMenu,
  onViewRecipe,
  onViewShoppingList,
  onViewCalendar,
  onViewPantry,
}: AICookingAssistantProps) {
  const { t, i18n } = useTranslation();
  const {
    addRecipe,
    fetchAllRecipes,
    fetchAllShoppingListItems,
    fetchAllPantryItems,
    fetchAllMealPlans,
  } = usePantry();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedRecipes, setSuggestedRecipes] = useState<RecipeSuggestion[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSuggestion | null>(null);
  const [addingToMenuRecipeId, setAddingToMenuRecipeId] = useState<string | null>(null);
  const [, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<{
    sessionId: string;
    pendingTools: PendingToolSummary[];
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const suggestedPrompts = useMemo(() => {
    const prompts = t('ai.suggestedPrompts', { returnObjects: true });
    return Array.isArray(prompts) ? (prompts as string[]) : [];
  }, [t, i18n.language]);

  // Auto-grow composer; beyond the cap the field scrolls so typed text stays visible.
  const COMPOSER_MAX_HEIGHT_PX = 240;
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
  }, [inputValue]);
  // Load sessions + history on mount
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const sessionsRes = await chatApi.listSessions();
        const list = sessionsRes.data?.sessions ?? [];
        setSessions(list);
        const initialId =
          list.find((s) => s.isDefault)?.id ?? list[0]?.id ?? null;
        setActiveSessionId(initialId);
        if (initialId) {
          await loadHistoryForSession(initialId);
        }
      } catch (error) {
        console.error('Failed to load chat sessions', error);
        try {
          const response = await chatApi.getHistory();
          if (response.success && response.data?.messages?.length) {
            setActiveSessionId(response.data.sessionId ?? null);
            setMessages(mapHistory(response.data.messages));
          }
        } catch (historyError) {
          console.error('Failed to load chat history', historyError);
        }
      }
    };

    void bootstrap();
  }, []);

  const mapHistory = (entries: HistoryMessage[]): Message[] =>
    entries.map((entry) => {
      const type = (entry.responseType as MessageType | undefined) ?? undefined;
      const cardTypes: MessageType[] = [
        'recipe_created', 'recipe_imported', 'recipe_updated',
        'shopping_list_updated', 'meal_plan_updated', 'pantry_updated',
        'preferences_updated', 'meal_suggestions', 'multi_action', 'action_result',
      ];
      return {
        id: entry.id,
        role: entry.role,
        content: entry.content.replace(/^\[Pantry context:[^\]]*\]\s*/i, '').trim() || entry.content,
        timestamp: entry.createdAt * 1000,
        type,
        cardData:
          type && cardTypes.includes(type) && entry.cardData
            ? (entry.cardData as ResponseCardData)
            : undefined,
      };
    });

  const loadHistoryForSession = async (sessionId: string) => {
    const response = await chatApi.getHistory(sessionId);
    if (response.success && response.data?.messages?.length) {
      setMessages(mapHistory(response.data.messages));
    } else {
      setMessages([]);
    }
  };

  const refreshSessions = async () => {
    const sessionsRes = await chatApi.listSessions();
    setSessions(sessionsRes.data?.sessions ?? []);
  };

  // Scroll to bottom of messages (only while the chat tab is visible)
  useEffect(() => {
    if (!isActive) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, isActive]);
  // Focus input when chat becomes visible
  useEffect(() => {
    if (!isActive) return;
    inputRef.current?.focus();
  }, [isActive]);

  // Prefill composer from empty-state / Home CTAs
  useEffect(() => {
    if (!isActive || !pendingPrompt) return;
    setInputValue(pendingPrompt);
    onPendingPromptConsumed?.();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isActive, pendingPrompt, onPendingPromptConsumed]);

  // Drawer Recents / New chat
  useEffect(() => {
    if (!isActive) return;
    if (requestNewChat) {
      void (async () => {
        await handleNewSession();
        onSessionRequestConsumed?.();
      })();
      return;
    }
    if (requestedSessionId) {
      void (async () => {
        await handleSwitchSession(requestedSessionId);
        onSessionRequestConsumed?.();
      })();
    }
    // handleSwitchSession / handleNewSession are stable enough for this shell; avoid re-firing on identity churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, requestedSessionId, requestNewChat]);

  const mapResponseToMessage = (response: ChatResponse): Message => {
    const cardTypes: MessageType[] = [
      'recipe_created', 'recipe_imported', 'recipe_updated',
      'shopping_list_updated', 'meal_plan_updated', 'pantry_updated',
      'preferences_updated', 'meal_suggestions', 'multi_action', 'action_result',
    ];
    const cardData = response.data as ResponseCardData | undefined;
    return {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      type: response.type === 'error' ? 'error' : response.type as MessageType,
      content: response.message,
      timestamp: Date.now(),
      cardData: cardTypes.includes(response.type as MessageType) ? cardData : undefined,
    };
  };

  const refreshAfterAgentAction = async (type: MessageType) => {
    const tasks: Promise<unknown>[] = [];
    if (['recipe_created', 'recipe_imported', 'recipe_updated', 'meal_suggestions', 'multi_action', 'action_result'].includes(type)) {
      tasks.push(fetchAllRecipes());
    }
    if (['meal_plan_updated', 'meal_suggestions', 'multi_action', 'action_result'].includes(type)) {
      tasks.push(fetchAllMealPlans());
    }
    if (['pantry_updated', 'meal_suggestions', 'multi_action', 'action_result'].includes(type)) {
      tasks.push(Promise.resolve(fetchAllPantryItems()));
    }
    if (['shopping_list_updated', 'meal_plan_updated', 'multi_action', 'action_result'].includes(type)) {
      tasks.push(fetchAllShoppingListItems());
    }
    await Promise.all(tasks);
  };

  const handleAddCreatedRecipeToMenu = async (recipeId: string) => {
    setAddingToMenuRecipeId(recipeId);
    try {
      const servingDate = new Date().toISOString().slice(0, 10);
      const response = await mealPlanApi.create({
        recipe_id: recipeId,
        meal_type: 'dinner',
        serving_date: servingDate,
      });
      if (!response.success) {
        throw new Error(response.message || "Failed to add recipe to today's dinner");
      }
      await Promise.all([fetchAllMealPlans(), fetchAllRecipes()]);
      const confirmationMessage: Message = {
        id: `confirmation-${Date.now()}`,
        role: 'assistant',
        content: `Added to today's dinner (${servingDate}). Open Calendar to see it — also filed under Dinner.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, confirmationMessage]);
    } catch (error) {
      console.error("Failed to add recipe to today's dinner", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        type: 'error',
        content: "Could not add this recipe to today's dinner. Please try again.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setAddingToMenuRecipeId(null);
    }
  };

  const handleViewCreatedRecipe = async (recipeId: string) => {
    await fetchAllRecipes();
    onViewRecipe?.(recipeId);
  };

  const handleViewCalendar = async () => {
    await fetchAllMealPlans();
    onViewCalendar?.();
  };

  const handleViewPantry = async () => {
    await fetchAllPantryItems();
    onViewPantry?.();
  };

  const handleViewShoppingList = async () => {
    await fetchAllShoppingListItems();
    onViewShoppingList?.();
  };

  const renderRecipeCard = (message: Message, label = 'Recipe') => {
    const steps = message.cardData?.steps ?? [];
    return (
      <div className="mt-3 bg-surface border border-line rounded-xl p-4">
        <h3 className="font-medium text-ink">{label}: {message.cardData?.recipeName}</h3>
        <p className="text-sm text-muted mt-1">
          {message.cardData?.ingredientCount ?? 0} ingredients · {steps.length} steps
        </p>
        {message.cardData?.sourceUrl && (
          <p className="text-xs text-muted mt-1 truncate">From: {message.cardData.sourceUrl}</p>
        )}
        {steps.length > 0 && (
          <ol className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {steps.map((step, index) => (
              <li key={index} className="flex text-sm text-ink">
                <span className="bg-sage rounded-full w-5 h-5 flex items-center justify-center text-herb-deep font-medium mr-2 flex-shrink-0 text-xs mt-0.5">
                  {index + 1}
                </span>
                <span className="leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => message.cardData?.recipeId && handleViewCreatedRecipe(message.cardData.recipeId)}
            className="flex-1 bg-sage/40 text-ink py-2 rounded-lg text-sm"
          >
            Edit Recipe
          </button>
              <button
                onClick={() => message.cardData?.recipeId && handleAddCreatedRecipeToMenu(message.cardData.recipeId)}
                disabled={addingToMenuRecipeId === message.cardData?.recipeId}
                className="flex-1 bg-herb text-white py-2 rounded-lg text-sm disabled:opacity-60"
              >
            Add to today's dinner
          </button>
        </div>
      </div>
    );
  };

  // Generate a streaming response from the backend
  const generateResponse = async (userInput: string) => {
    const assistantId = `assistant-${Date.now()}`;
    const streamingMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      streaming: true,
    };

    setMessages(prev => [...prev, streamingMessage]);
    setIsTyping(true);
    setPendingApproval(null);
    let settled = false;

    const settleStreaming = (updater: (message: Message) => Message) => {
      settled = true;
      setMessages(prev => prev.map(message =>
        message.id === assistantId ? updater(message) : message
      ));
    };

    try {
      await chatApi.streamSend(
        { message: userInput, sessionId: activeSessionId ?? undefined },
        {
          onToken: (token) => {
            setMessages(prev => prev.map(message =>
              message.id === assistantId
                ? { ...message, content: message.content + token, statusText: undefined }
                : message
            ));
          },
          onStatus: (status) => {
            setMessages(prev => prev.map(message =>
              message.id === assistantId
                ? { ...message, statusText: status.message }
                : message
            ));
          },
          onInterrupt: (response) => {
            const tools = (response.data?.pendingTools as PendingToolSummary[] | undefined) ?? [];
            const sessionId =
              (response.data?.sessionId as string | undefined) ??
              activeSessionId ??
              '';
            setPendingApproval({ sessionId, pendingTools: tools });
            settleStreaming((message) => ({
              ...message,
              type: 'interrupt',
              content: response.message || 'Approval required before applying changes.',
              streaming: false,
              statusText: undefined,
            }));
          },
          onDone: async (response) => {
            if (response.type === 'interrupt') {
              const tools = (response.data?.pendingTools as PendingToolSummary[] | undefined) ?? [];
              const sessionId =
                (response.data?.sessionId as string | undefined) ??
                activeSessionId ??
                '';
              setPendingApproval({ sessionId, pendingTools: tools });
              settleStreaming((message) => ({
                ...message,
                type: 'interrupt',
                content: response.message || 'Approval required before applying changes.',
                streaming: false,
                statusText: undefined,
              }));
              return;
            }
            const finalized = mapResponseToMessage(response);
            settleStreaming((message) => ({
              ...finalized,
              id: assistantId,
              timestamp: message.timestamp,
              streaming: false,
              statusText: undefined,
            }));
            if (finalized.type && finalized.type !== 'text' && finalized.type !== 'error') {
              await refreshAfterAgentAction(finalized.type);
            }
            setSuggestedRecipes([]);
          },
          onError: (message) => {
            settleStreaming((entry) => ({
              ...entry,
              type: 'error',
              content: message || "I'm sorry, I'm having trouble connecting to my cooking brain right now. Please try again in a moment.",
              streaming: false,
              statusText: undefined,
            }));
          },
        },
      );
    } catch (error) {
      console.error('Chat stream error:', error);
      if (!settled) {
        settleStreaming((message) => ({
          ...message,
          type: 'error',
          content: "I'm sorry, I'm having trouble connecting to my cooking brain right now. Please try again in a moment.",
          streaming: false,
        }));
      }
    } finally {
      setIsTyping(false);
      if (!settled) {
        setMessages(prev => prev.map(message =>
          message.id === assistantId
            ? { ...message, streaming: false }
            : message
        ));
      }
    }
  };

  const handleResume = async (decision: 'approve' | 'reject') => {
    if (!pendingApproval) return;
    setIsTyping(true);
    try {
      const response = await chatApi.resume({
        sessionId: pendingApproval.sessionId,
        decision,
      });
      setPendingApproval(null);
      if (response.success && response.data) {
        const finalized = mapResponseToMessage(response.data);
        setMessages((prev) => [...prev, finalized]);
        if (finalized.type && finalized.type !== 'text' && finalized.type !== 'error' && finalized.type !== 'interrupt') {
          await refreshAfterAgentAction(finalized.type);
        }
        if (response.data.type === 'interrupt') {
          const tools = (response.data.data?.pendingTools as PendingToolSummary[] | undefined) ?? [];
          setPendingApproval({
            sessionId: pendingApproval.sessionId,
            pendingTools: tools,
          });
        }
      }
    } catch (error) {
      console.error('Chat resume failed', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSwitchSession = async (sessionId: string) => {
    if (sessionId === activeSessionId || isTyping) return;
    setActiveSessionId(sessionId);
    setPendingApproval(null);
    await loadHistoryForSession(sessionId);
  };

  const handleNewSession = async () => {
    try {
      const created = await chatApi.createSession();
      if (created.success && created.data) {
        await refreshSessions();
        setActiveSessionId(created.data.id);
        setPendingApproval(null);
        setMessages([]);
        setSuggestedRecipes([]);
        setSelectedRecipe(null);
        setInputValue('');
      }
    } catch (error) {
      console.error('Failed to create chat session', error);
    }
  };
  // Handle sending a message
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: Date.now()
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputValue('');
    // Generate response
    generateResponse(inputValue);
  };
  // Handle adding a recipe to the cooking app
  const handleAddToRecipes = (recipe: RecipeSuggestion) => {
    // Format recipe for the cooking app
    // Using cast to any to satisfy the complex Recipe type while providing essential fields
    const newRecipe: any = {
      id: `ai-recipe-${Date.now()}`,
      folder_id: 'ai-suggestions',
      meal_name: recipe.mealName || recipe.name,
      instructions: recipe.instructions,
      cookTime: recipe.cookTime,
      ingredients: recipe.ingredients.map((ing: any) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
      image: recipe.image ? { public_id: 'ai-gen', url: recipe.image } : null
    };
    // Add to recipes
    addRecipe(newRecipe);
    // Add confirmation message
    const confirmationMessage: Message = {
      id: `confirmation-${Date.now()}`,
      role: 'assistant',
      content: `I've added "${recipe.mealName}" to your recipe collection. You can find it in the Recipe Manager.`,
      timestamp: Date.now()
    };
    setMessages(prevMessages => [...prevMessages, confirmationMessage]);
  };
  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col w-full h-[100dvh] min-h-screen bg-linen">
      <AppHeader
        title={t('nav.aiChat')}
        onOpenMenu={onOpenMenu}
        onNewChat={() => {
          if (!isTyping) void handleNewSession();
        }}
      />

      {pendingApproval && (
        <div className="shrink-0 max-w-3xl mx-auto w-full px-4 pt-3">
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-sm font-medium text-ink">Approve these changes?</p>
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
                className="flex-1 bg-herb text-white py-2 rounded-lg text-sm disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={isTyping}
                onClick={() => void handleResume('reject')}
                className="flex-1 bg-sage/40 text-ink py-2 rounded-lg text-sm disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-4">
          {selectedRecipe ? (
            <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
              <div className="p-4 border-b border-line bg-linen flex justify-between items-center">
                <h2 className="font-semibold text-ink">{selectedRecipe.mealName}</h2>
                <button onClick={() => setSelectedRecipe(null)} className="p-1 rounded-full hover:bg-sage/60" aria-label="Close">
                  <XIcon size={18} className="text-muted" />
                </button>
              </div>
              <div className="p-6">
                {selectedRecipe.image && (
                  <div className="rounded-xl overflow-hidden h-40 mb-6">
                    <img src={selectedRecipe.image} alt={selectedRecipe.mealName} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-medium text-ink mb-2">{t('ai.ingredients')}</h3>
                  <ul className="space-y-2">
                    {selectedRecipe.ingredients.map((ingredient: { quantity?: string | number; unit?: string; name: string }, index: number) => (
                      <li key={index} className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-herb mr-2" />
                        <span>
                          {ingredient.quantity} {ingredient.unit} {ingredient.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mb-6">
                  <h3 className="font-medium text-ink mb-2">{t('ai.instructions')}</h3>
                  <ol className="space-y-3">
                    {selectedRecipe.instructions.map((step: string, index: number) => (
                      <li key={index} className="flex">
                        <div className="bg-sage rounded-full w-6 h-6 flex items-center justify-center text-herb-deep font-medium mr-3 flex-shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-ink">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="flex gap-2 pt-4">
                  <button onClick={() => setSelectedRecipe(null)} className="w-1/2 bg-sage/40 text-ink py-2 rounded-lg">
                    Back
                  </button>
                  <button
                    onClick={() => handleAddToRecipes(selectedRecipe)}
                    className="w-1/2 bg-herb text-white py-2 rounded-lg flex items-center justify-center"
                  >
                    <PlusCircleIcon size={18} className="mr-1" />
                    Add to Recipes
                  </button>
                </div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <ChatEmptyState
              suggestedPrompts={suggestedPrompts}
              onSelectPrompt={setInputValue}
            />
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 sm:p-4 ${
                      message.role === 'user'
                        ? 'bg-herb text-white'
                        : message.type === 'error'
                          ? 'bg-sage/50 text-herb-deep border border-line'
                          : 'bg-sage/40 text-ink'
                    }`}
                  >
                    <div>
                      {message.streaming && !message.content ? (
                        <div className="space-y-2">
                          <div className="flex space-x-1.5 py-1">
                            <span className="w-2 h-2 rounded-full bg-muted/70 animate-bounce [animation-delay:0ms]" />
                            <span className="w-2 h-2 rounded-full bg-muted/70 animate-bounce [animation-delay:150ms]" />
                            <span className="w-2 h-2 rounded-full bg-muted/70 animate-bounce [animation-delay:300ms]" />
                          </div>
                          {message.statusText && (
                            <p className="text-xs text-muted">{message.statusText}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          <ChatMessageContent
                            content={message.content}
                            variant={message.role === 'user' ? 'user' : 'assistant'}
                          />
                          {message.streaming && (
                            <span
                              aria-hidden="true"
                              className="inline-block w-0.5 h-[1.1em] ml-0.5 bg-herb align-text-bottom animate-pulse"
                            />
                          )}
                          {message.streaming && message.statusText && (
                            <p className="mt-2 text-xs text-muted">{message.statusText}</p>
                          )}
                        </>
                      )}
                    </div>
                    {message.type === 'recipe_created' && message.cardData && renderRecipeCard(message)}
                    {message.type === 'recipe_imported' && message.cardData && renderRecipeCard(message, 'Imported recipe')}
                    {message.type === 'recipe_updated' && message.cardData && (
                      <div className="mt-3 bg-surface border border-line rounded-xl p-4">
                        <p className="font-medium text-ink">Updated: {message.cardData.recipeName}</p>
                        <button
                          onClick={() => message.cardData?.recipeId && handleViewCreatedRecipe(message.cardData.recipeId)}
                          className="w-full mt-3 bg-sage/40 text-ink py-2 rounded-lg text-sm"
                        >
                          Edit Recipe
                        </button>
                      </div>
                    )}
                    {message.type === 'shopping_list_updated' && message.cardData && (
                      <div className="mt-3 bg-surface border border-line rounded-xl p-4">
                        <p className="font-medium text-ink">
                          Added {message.cardData.itemsAdded ?? 0} items to your shopping list
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {(message.cardData.items ?? []).map((item, index) => (
                            <span key={`${item.name}-${index}`} className="text-xs bg-sage/50 text-herb-deep px-2 py-1 rounded-full">
                              {item.name}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={handleViewShoppingList}
                          className="w-full mt-3 bg-herb text-white py-2 rounded-lg text-sm"
                        >
                          View Shopping List
                        </button>
                      </div>
                    )}
                    {message.type === 'meal_plan_updated' && message.cardData && (
                      <div className="mt-3 bg-surface border border-line rounded-xl p-4">
                        <p className="font-medium text-ink">
                          {message.cardData.mealsScheduled
                            ? `Scheduled ${message.cardData.mealsScheduled} meal(s)`
                            : message.cardData.recipeName
                              ? `${message.cardData.recipeName} — ${message.cardData.mealType} on ${message.cardData.servingDate}`
                              : 'Meal plan updated'}
                        </p>
                        {(message.cardData.meals ?? []).length > 0 && (
                          <ul className="mt-2 text-sm text-muted space-y-1">
                            {message.cardData.meals!.map((meal, index) => (
                              <li key={index}>
                                {meal.meal_name} · {meal.meal_type} · {meal.serving_date}
                              </li>
                            ))}
                          </ul>
                        )}
                        <button onClick={handleViewCalendar} className="w-full mt-3 bg-herb text-white py-2 rounded-lg text-sm">
                          Open Calendar
                        </button>
                      </div>
                    )}
                    {message.type === 'pantry_updated' && message.cardData && (
                      <div className="mt-3 bg-surface border border-line rounded-xl p-4">
                        <p className="font-medium text-ink">
                          {message.cardData.removedDuplicates != null
                            ? `Pantry organized — merged ${message.cardData.mergedGroups ?? 0} group(s)`
                            : `Added ${message.cardData.itemsAdded ?? 0} item(s) to pantry`}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {(message.cardData.items ?? []).map((item, index) => (
                            <span key={`${item.name}-${index}`} className="text-xs bg-sage/50 text-herb-deep px-2 py-1 rounded-full">
                              {item.name}
                            </span>
                          ))}
                        </div>
                        <button onClick={handleViewPantry} className="w-full mt-3 bg-herb text-white py-2 rounded-lg text-sm">
                          Open Pantry
                        </button>
                      </div>
                    )}
                    {message.type === 'preferences_updated' && message.cardData && (
                      <div className="mt-3 bg-surface border border-line rounded-xl p-4">
                        <p className="font-medium text-ink mb-2">Preferences saved</p>
                        <div className="text-sm text-muted space-y-1">
                          {message.cardData.allergies?.length ? (
                            <p>Allergies: {message.cardData.allergies.join(', ')}</p>
                          ) : null}
                          {message.cardData.dietaryRestrictions?.length ? (
                            <p>Diet: {message.cardData.dietaryRestrictions.join(', ')}</p>
                          ) : null}
                          {message.cardData.householdNotes ? (
                            <p>Household: {message.cardData.householdNotes}</p>
                          ) : null}
                        </div>
                      </div>
                    )}
                    {message.type === 'meal_suggestions' && message.cardData && (
                      <div className="mt-3 bg-surface border border-line rounded-xl p-4">
                        <p className="font-medium text-ink mb-2">Meal suggestions</p>
                        <ul className="space-y-2">
                          {(message.cardData.suggestions ?? []).map((s, index) => (
                            <li key={index} className="text-sm text-ink flex justify-between">
                              <span>{s.recipeName}</span>
                              <span className="text-muted">{s.matchScore}% match</span>
                            </li>
                          ))}
                        </ul>
                        <button onClick={handleViewCalendar} className="w-full mt-3 bg-sage/40 text-ink py-2 rounded-lg text-sm">
                          View Calendar
                        </button>
                      </div>
                    )}
                    {message.type === 'multi_action' && message.cardData && (
                      <div className="mt-3 bg-surface border border-line rounded-xl p-4">
                        <p className="font-medium text-ink">
                          Completed {message.cardData.actionCount ?? 0} action(s)
                        </p>
                        <ul className="mt-2 text-sm text-muted space-y-1">
                          {(message.cardData.actions ?? []).map((action, index) => (
                            <li key={index}>{String(action.message ?? action.tool ?? 'Action')}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div
                      className={`text-xs mt-1 ${
                        message.role === 'user'
                          ? 'text-white/70'
                          : message.type === 'error'
                            ? 'text-herb'
                            : 'text-muted'
                      }`}
                    >
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              {suggestedRecipes.length > 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-surface border border-line rounded-2xl p-4 shadow-sm">
                    <h3 className="font-medium text-ink mb-2">Suggested Recipes</h3>
                    <div className="space-y-3">
                      {suggestedRecipes.map((recipe) => (
                        <div key={recipe.id} className="border border-line rounded-lg p-3 hover:bg-linen">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-ink">{recipe.mealName}</h4>
                            <button
                              onClick={() => setSelectedRecipe(recipe)}
                              className="p-1 rounded-full hover:bg-sage/60 text-muted"
                              title="View recipe"
                            >
                              <ChevronRightIcon size={16} />
                            </button>
                          </div>
                          {recipe.missingIngredient && (
                            <div className="flex items-center text-muted text-xs">
                              <ShoppingCartIcon size={12} className="mr-1" />
                              <span>Missing: {recipe.missingIngredient.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {!selectedRecipe && (
        <div className="shrink-0 border-t border-line bg-linen px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
          <div className="max-w-3xl mx-auto w-full">
            <div className="relative flex items-center rounded-[22px] border border-line bg-surface focus-within:ring-2 focus-within:ring-herb/30 focus-within:border-transparent min-h-[44px]">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={t('ai.placeholder')}
                className="w-full resize-none overflow-y-auto bg-transparent py-2.5 pl-4 pr-14 text-base leading-6 text-ink placeholder:text-muted focus:outline-none disabled:opacity-60 min-h-[44px] max-h-40"
                disabled={isTyping}
                aria-label={t('ai.placeholder')}
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                aria-label="Send message"
                className="absolute right-1.5 bottom-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-herb text-white hover:bg-herb-deep disabled:bg-sage/60 disabled:text-muted transition-colors"
              >
                <SendIcon size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}