import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { splitInstructionSteps } from '../utils/recipeSteps';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon, PackageIcon, ImageIcon, PlusIcon, TrashIcon, XIcon, AlertCircleIcon, SearchIcon, ChevronDownIcon, CalendarIcon, ListIcon, MoreHorizontalIcon, ChevronUpIcon, ShoppingCartIcon } from 'lucide-react';
import { usePantry, normalizeRecipe } from '../contexts/pantryContext';
import { mealPlanApi } from '../api/mealPlan';
import {
  MealAvailabilityEntry,
  MealAvailabilityStatus,
  MealConfirmShortage,
  MealPlan,
  Recipe,
} from '../api/types';
import { recipeApi } from '../api/recipes';
import { Loading } from './Loading';
import { AppHeader } from './AppHeader';
import { dateLocale } from '../i18n';
import {
  defaultExpandedDay,
  groupMealPlansByDate,
  mealTypePresence,
  parseLocalDate,
  relativeDayKey,
  shortageRangeLabel,
  startOfWeekLocal,
} from '../utils/calendarDates';
import {
  planRangeShortages,
  shortageDeficit,
  shortagesNotOnList,
} from '../utils/shortages';
interface CalendarProps {
  onBack: () => void;
  onOpenMenu?: () => void;
  /** Opens the chat composer prefilled with a prompt (same hook other pages use). */
  onAskAi?: (prompt: string, opts?: { autoSend?: boolean }) => void;
}
export function Calendar({
  onBack: _onBack,
  onOpenMenu,
  onAskAi,
}: CalendarProps) {
  const { t, i18n } = useTranslation();
  const {
    addMealPlan,
    deleteMealPlan,
    fetchAllMealPlans,
    fetchAllRecipes,
    confirmMealPlan,
    skipMealPlan,
    mealPlan: contextMealPlans,
    recipes: contextRecipes,
    mealPlansLoading,
    recipesLoading,
    fetchAllShoppingListItems,
    addShoppingListItem,
    shoppingList,
    pantryItems,
  } = usePantry();
  // Recipes fetched on demand for a meal plan whose recipe is not in the context list.
  const [extraRecipes, setExtraRecipes] = useState<Recipe[]>([]);
  const recipes = useMemo(
    () =>
      extraRecipes.length
        ? [...contextRecipes, ...extraRecipes.filter((r) => !contextRecipes.some((c) => c.id === r.id))]
        : contextRecipes,
    [contextRecipes, extraRecipes],
  );
  const [showRecipeDetailModal, setShowRecipeDetailModal] = useState(false);
  const [selectedRecipeForDetail, setSelectedRecipeForDetail] = useState<Recipe | null>(null);
  // The context list is the single source of truth (its actions update it optimistically).
  const mealPlans = contextMealPlans;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<any>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('dinner');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Week list is the primary calendar hub view
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  // List view week navigation state
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    // Initialize to the start of the current week (Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 for Sunday, 1 for Monday, etc.
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek); // Go back to Sunday
    startDate.setHours(0, 0, 0, 0); // Start of day
    return startDate;
  });
  // Start with today's local row expanded (first view), not [] + a later effect.
  const [expandedDateGroups, setExpandedDateGroups] = useState<string[]>(() => [
    defaultExpandedDay(startOfWeekLocal(new Date())),
  ]);
  const [showItemActions, setShowItemActions] = useState<string | null>(null);
  // Evaluate today once per render instead of per grid cell.
  const todayParts = (() => {
    const now = new Date();
    return { date: now.getDate(), month: now.getMonth(), year: now.getFullYear() };
  })();
  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  // New state for notification
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationShortages, setNotificationShortages] = useState<MealConfirmShortage[] | null>(null);
  const [availabilityByMealId, setAvailabilityByMealId] = useState<Record<string, MealAvailabilityEntry>>({});
  const [weekShortages, setWeekShortages] = useState<MealConfirmShortage[]>([]);
  const [shortageRange, setShortageRange] = useState<{ from: string; to: string } | null>(null);
  const [addingShopping, setAddingShopping] = useState(false);
  // Get number of days in current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Get day of week of first day of month (0 = Sunday, 6 = Saturday)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const isInitialLoading = (mealPlansLoading || recipesLoading) && mealPlans.length === 0 && recipes.length === 0;
  useEffect(() => {
    // Fetchers are deduped + TTL-cached in the context, so revisiting is cheap.
    void fetchAllMealPlans();
    void fetchAllRecipes();
    void fetchAllShoppingListItems();
  }, [fetchAllMealPlans, fetchAllRecipes, fetchAllShoppingListItems]);
  // Create array of days for the calendar
  const calendarDays = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => {
        const dayNumber = i - firstDayOfMonth + 1;
        return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
      }),
    [firstDayOfMonth, daysInMonth],
  );
  // One pass over the plans instead of a filter per grid cell / per render.
  const mealsByDate = useMemo(() => groupMealPlansByDate(mealPlans), [mealPlans]);
  const noMeals: MealPlan[] = useMemo(() => [], []);
  // Format date to YYYY-MM-DD for comparison
  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  // Format date from Date object to YYYY-MM-DD
  const formatDateObj = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getWeekBounds = useCallback(() => {
    const from = formatDateObj(currentWeekStart);
    const end = new Date(currentWeekStart);
    end.setDate(currentWeekStart.getDate() + 6);
    const to = formatDateObj(end);
    return { from, to };
  }, [currentWeekStart]);

  // Only the latest availability request may apply its result (stale responses and
  // aborted requests are dropped), so shortage banners never show out-of-date data.
  const availabilityRequestRef = useRef(0);
  const availabilityAbortRef = useRef<AbortController | null>(null);

  const refreshAvailability = useCallback(async () => {
    availabilityAbortRef.current?.abort();
    const controller = new AbortController();
    availabilityAbortRef.current = controller;
    const requestId = ++availabilityRequestRef.current;
    const week = getWeekBounds();
    const monthFrom = formatDateString(currentYear, currentMonth, 1);
    const monthTo = formatDateString(currentYear, currentMonth, daysInMonth);
    const from = week.from < monthFrom ? week.from : monthFrom;
    // Plans can run past the visible week (and month), so look two weeks ahead.
    const weekPlus = new Date(currentWeekStart);
    weekPlus.setDate(currentWeekStart.getDate() + 20);
    const planTo = formatDateObj(weekPlus);
    const to = [week.to, monthTo, planTo].sort().pop() as string;
    try {
      const res = await mealPlanApi.availability(from, to, { signal: controller.signal });
      if (requestId !== availabilityRequestRef.current || controller.signal.aborted) return;
      if (res.success && res.data) {
        const map: Record<string, MealAvailabilityEntry> = {};
        for (const entry of res.data.meals ?? []) {
          map[entry.meal_plan_id] = entry;
        }
        setAvailabilityByMealId(map);
        // Banner = plan-range totals (this week and any later planned days, e.g. a
        // Sunday that falls in the next calendar week), built from the same per-meal
        // deficits the rows show, so banner, rows and shopping list agree.
        const range = planRangeShortages(res.data.meals ?? [], week.from);
        setWeekShortages(range.shortages);
        setShortageRange(range.from && range.to ? { from: range.from, to: range.to } : null);
      }
    } catch (err) {
      if (controller.signal.aborted || (err as { name?: string })?.name === 'AbortError') return;
      console.error('Failed to load meal availability:', err);
    }
  }, [getWeekBounds, currentYear, currentMonth, daysInMonth, currentWeekStart]);

  // Re-runs when the visible range or the plans change; the previous request is cancelled.
  // Plan mutations (add / delete / confirm / skip) all change `mealPlans`, so they land here.
  // Buying and checking off shopping items syncs them into the pantry, which changes what is
  // still missing. Re-run availability when the pantry contents change (debounced) so the red
  // "Need" lines clear without a reload.
  const pantrySignature = useMemo(
    () => (pantryItems ?? []).map((p) => `${p.id}:${p.quantity}:${p.unit ?? ''}`).join('|'),
    [pantryItems],
  );
  useEffect(() => {
    const handle = setTimeout(() => void refreshAvailability(), 300);
    return () => clearTimeout(handle);
  }, [refreshAvailability, mealPlans, pantrySignature]);
  useEffect(() => () => availabilityAbortRef.current?.abort(), []);

  const clearNotificationTimer = () => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }
  };

  const showToast = (message: string, opts?: { shortages?: MealConfirmShortage[]; durationMs?: number }) => {
    clearNotificationTimer();
    setNotificationMessage(message);
    setNotificationShortages(opts?.shortages ?? null);
    setShowNotification(true);
    notificationTimerRef.current = setTimeout(() => {
      setShowNotification(false);
      setNotificationShortages(null);
    }, opts?.durationMs ?? 5000);
  };

  const addShortagesToShopping = async (shortages: MealConfirmShortage[]) => {
    if (!shortages.length || addingShopping) return;
    setAddingShopping(true);
    try {
      // Server merges qty by CI name + unit onto unchecked rows (closed-loop QA #2).
      // Merge identical name+unit shortages client-side (the server would merge them
      // anyway) so the adds can run in parallel without racing on the same row.
      const merged = new Map<string, { s: MealConfirmShortage; qty: number }>();
      for (const s of shortages) {
        const qty = Math.max(0, s.needed - (s.available ?? 0)) || s.needed;
        if (qty <= 0) continue;
        const key = [s.name.trim().toLowerCase(), s.unit, s.ingredient_id ?? ''].join('|');
        const existing = merged.get(key);
        if (existing) existing.qty += qty;
        else merged.set(key, { s, qty });
      }
      await Promise.all(
        [...merged.values()].map(({ s, qty }) =>
          addShoppingListItem({
            name: s.name,
            quantity: qty,
            unit: s.unit,
            checked: false,
            ...(s.ingredient_id ? { ingredient_id: s.ingredient_id } : {}),
          }),
        ),
      );
      const added = merged.size;
      if (added > 0) {
        showToast(t('calendar.addedToShopping', { count: added }), { durationMs: 3500 });
        await fetchAllShoppingListItems({ force: true });
        await refreshAvailability();
      } else {
        showToast(t('calendar.nothingToAdd'), { durationMs: 3500 });
      }
    } catch (err) {
      console.error('Failed to add shortages to shopping:', err);
    } finally {
      setAddingShopping(false);
    }
  };

  /** Meal plans created without a name fall back to their recipe's name. */
  const mealTitle = (item: MealPlan): string =>
    item.meal_name?.trim() ||
    recipes.find((r) => String(r.id) === String(item.recipe_id ?? ''))?.meal_name?.trim() ||
    t('calendar.untitledMeal');

  const mealThumbUrl = (item: MealPlan): string | null => {
    if (item.image && typeof item.image === 'string' && item.image.trim()) {
      return item.image.trim();
    }
    const recipe = recipes.find((r) => String(r.id) === String(item.recipe_id ?? ''));
    return recipe?.image?.url ?? null;
  };

  const stockLightClass = (status: MealAvailabilityStatus | undefined) => {
    switch (status) {
      case 'ok':
        return 'bg-herb';
      case 'short':
        return 'bg-red-500';
      case 'unknown':
      default:
        return 'bg-muted';
    }
  };

  const stockLightTitle = (status: MealAvailabilityStatus | undefined) => {
    switch (status) {
      case 'ok':
        return t('calendar.stockOk');
      case 'short':
        return t('calendar.stockShort');
      default:
        return t('calendar.stockUnknown');
    }
  };

  const formatShortageSummary = (shortages: MealConfirmShortage[]) => {
    const summary = shortages
      .slice(0, 3)
      .map((s) => `${s.name} (${shortageDeficit(s)}${s.unit})`)
      .join('; ');
    const extra = shortages.length > 3 ? ` +${shortages.length - 3}` : '';
    return { summary, extra };
  };
  // Get cooking history for selected date
  // Cooking history for the selected date, grouped by meal type (memoised).
  const selectedDayMeals = useMemo(
    () =>
      selectedDate
        ? mealsByDate.get(formatDateString(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())) ?? noMeals
        : noMeals,
    [selectedDate, mealsByDate, noMeals],
  );
  const historyByMealType = useMemo(() => {
    const history = selectedDayMeals;
    return {
      breakfast: history.filter((item: MealPlan) => item.meal_type === 'breakfast'),
      lunch: history.filter((item: MealPlan) => item.meal_type === 'lunch'),
      dinner: history.filter((item: MealPlan) => item.meal_type === 'dinner'),
      snack: history.filter((item: MealPlan) => item.meal_type === 'snack')
    };
  }, [selectedDayMeals]);
  // Navigation functions
  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDate(null);
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDate(null);
  };
  const handleDayClick = (day: number | null) => {
    if (!day) return;
    setSelectedDate(new Date(currentYear, currentMonth, day));
  };
  // Month names for header
  const monthNames = Array.from({ length: 12 }, (_, i) => t(`months.${i}`));
  // Day names for header
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Get meal type color
  const getMealTypeColor = (type: string) => {
    switch (type) {
      case 'breakfast':
        return 'bg-sage/50 border-blue-100 text-blue-700';
      case 'lunch':
        return 'bg-sage/50 border-amber-100 text-muted';
      case 'dinner':
        return 'bg-sage/50 border-line text-herb-deep';
      case 'snack':
        return 'bg-sage/50 border-line text-herb-deep';
      default:
        return 'bg-linen border-line text-ink';
    }
  };
  const getMealTypeLabel = (type: string) => {
    const key = `mealTypes.${type}` as const;
    return t(key, { defaultValue: type.charAt(0).toUpperCase() + type.slice(1) });
  };
  // Distinct colors so calendar days show which meals are planned at a glance
  const getMealTypeIndicatorColor = (type: string) => {
    switch (type) {
      case 'breakfast':
        return 'bg-amber-500';
      case 'lunch':
        return 'bg-sky-500';
      case 'dinner':
        return 'bg-herb';
      case 'snack':
        return 'bg-orange-400';
      default:
        return 'bg-muted';
    }
  };
  const mealTypeOrder = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

  // Handle add recipe
  const handleOpenAddRecipe = (date?: Date) => {
    const dateToUse = date || selectedDate || new Date();
    setSelectedDate(dateToUse);
    setSelectedRecipeId('');
    setSelectedMealType('dinner');
    setSearchQuery('');
    setShowAddRecipeModal(true);
    setIsDropdownOpen(false);
  };
  // Handle recipe deletion
  const handleDeleteRecipe = (recipe: any) => {
    setRecipeToDelete(recipe);
    setShowDeleteConfirmation(true);
  };
  // Confirm recipe deletion
  const confirmDeleteRecipe = async () => {
    if (recipeToDelete) {
      await deleteMealPlan(recipeToDelete.id);
      setShowDeleteConfirmation(false);
      setRecipeToDelete(null);
    }
  };

  const showShortageTip = (shortages: MealConfirmShortage[]) => {
    if (!shortages.length) return;
    const { summary, extra } = formatShortageSummary(shortages);
    showToast(t('calendar.shortage', { summary, extra }), {
      shortages,
      durationMs: 8000,
    });
  };

  const handleConfirmMeal = async (item: MealPlan, e?: { stopPropagation: () => void }) => {
    e?.stopPropagation();
    const response = await confirmMealPlan(item.id);
    if (response.success && response.data) {
      const shortages = response.data.shortages || [];
      if (shortages.length > 0) {
        showShortageTip(shortages);
      } else {
        showToast(t('calendar.confirmed', { name: item.meal_name }), { durationMs: 3500 });
      }
    }
  };

  const handleSkipMeal = async (item: MealPlan, e?: { stopPropagation: () => void }) => {
    e?.stopPropagation();
    const response = await skipMealPlan(item.id);
    if (response.success) {
      showToast(t('calendar.skipped', { name: item.meal_name }), { durationMs: 3000 });
    }
  };

  const pendingMeals = useMemo(() => mealPlans.filter(m => m.status === 'PENDING_CONFIRM'), [mealPlans]);
  const canActOnMeal = (item: MealPlan) =>
    !item.status || item.status === 'PLANNED' || item.status === 'PENDING_CONFIRM';

  // Filter recipes based on search query
  const filteredRecipes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return recipes.filter(recipe => (recipe ? recipe.meal_name.toLowerCase().includes(q) : false));
  }, [recipes, searchQuery]);
  // Handle selecting a recipe from the dropdown
  const handleSelectRecipe = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setIsDropdownOpen(false);
    // Update recipe name in search field
    const selectedRecipe = recipes.find(r => r.id === recipeId);
    if (selectedRecipe) {
      if (selectedRecipe) {
        setSearchQuery(selectedRecipe.meal_name);
      }
    }
  };
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);
  // Save selected recipe to calendar
  const handleSaveRecipe = async () => {
    if (!selectedRecipeId) return;
    // Find the selected recipe
    const recipe = recipes.find(r => r.id === selectedRecipeId);
    if (!recipe) return;
    // Format the date string
    const dateString = selectedDate ? formatDateString(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()) : formatDateObj(new Date());
    // Create a recipe object for the cooking history
    let meal_name = '';
    if (recipe) {
      meal_name = recipe.meal_name;
    }
    const calendarRecipe = {
      id: `mealplan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      recipe_id: selectedRecipeId,
      meal_name: meal_name,
      meal_type: selectedMealType,
      serving_date: dateString,
    };
    const response = await addMealPlan(calendarRecipe);
    if (response && response.success && response.data) {
      // Context already holds the saved plan; the availability effect re-runs on that change.
      showToast(t('calendar.recipeAdded'), { durationMs: 3000 });
      resetAddModal();
    }
  };

  const resetAddModal = () => {
    setSelectedRecipeId('');
    setSearchQuery('');
    setShowAddRecipeModal(false);
  };

  // Week navigation functions
  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };
  const goToNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };
  const goToCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek);
    startDate.setHours(0, 0, 0, 0);
    setCurrentWeekStart(startDate);
  };
  // Get list view data for the current week
  const weekViewData = useMemo(() => {
    const weekData: Record<string, MealPlan[]> = {};
    // All 7 days of the week, even if they have no meals
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      const dateString = formatDateObj(date);
      weekData[dateString] = mealsByDate.get(dateString) ?? [];
    }
    return weekData;
  }, [currentWeekStart, mealsByDate]);
  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    const date = parseLocalDate(dateString);
    const rel = relativeDayKey(dateString);
    if (rel) return t(`common.${rel}`);
    // Otherwise return formatted date
    return date.toLocaleDateString(dateLocale(i18n.language), {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleMealClick = async (item: MealPlan) => {
    const recipeId = String(item.recipe_id ?? '').trim();
    let recipe = recipes.find(r => String(r.id) === recipeId) ?? null;

    if (!recipe && recipeId) {
      try {
        const response = await recipeApi.get(recipeId);
        if (response.success && response.data) {
          const raw = response.data as unknown;
          const payload = (raw && typeof raw === 'object' && 'recipe' in (raw as object)
            ? (raw as { recipe: Record<string, unknown> }).recipe
            : raw) as Record<string, unknown>;
          recipe = normalizeRecipe(payload);
          setExtraRecipes(prev => (prev.some(r => r.id === recipe!.id) ? prev : [...prev, recipe!]));
        }
      } catch (err) {
        console.error('Failed to load recipe for meal plan:', err);
      }
    }

    setSelectedRecipeForDetail(
      recipe ?? {
        id: recipeId,
        meal_name: item.meal_name || 'Recipe',
        folder_id: '',
        instructions: [],
        ingredients: [],
        image: null,
      }
    );
    setShowRecipeDetailModal(true);
  };
  // Format week range for display
  const getWeekRangeDisplay = () => {
    const weekStart = new Date(currentWeekStart);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const formatDate = (date: Date) =>
      `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  };
  // Toggle date group expansion
  const toggleDateGroupExpansion = (date: string) => {
    if (expandedDateGroups.includes(date)) {
      setExpandedDateGroups(expandedDateGroups.filter(d => d !== date));
    } else {
      setExpandedDateGroups([...expandedDateGroups, date]);
    }
  };
  // Toggle item actions menu
  const toggleItemActions = (itemId: string) => {
    if (showItemActions === itemId) {
      setShowItemActions(null);
    } else {
      setShowItemActions(itemId);
    }
  };
  // Default expansion: today's row when it is in the visible week (local date, not UTC),
  // otherwise the first day of the week. Runs on every week change.
  useEffect(() => {
    const now = new Date();
    setSelectedDate(now);
    setExpandedDateGroups([defaultExpandedDay(currentWeekStart, now)]);
  }, [currentWeekStart]);

  return <div className="flex flex-col w-full min-h-screen bg-linen">
    <AppHeader
      title={t('calendar.title')}
      onOpenMenu={onOpenMenu}
      rightSlot={
        <div className="flex items-center gap-1">
          {onAskAi ? (
            <button
              type="button"
              onClick={() => onAskAi(t('calendar.planWeekPrompt'), { autoSend: true })}
              className="h-10 px-3 inline-flex items-center rounded-full text-sm font-medium text-herb-deep bg-sage/50 hover:bg-sage transition-colors"
            >
              {t('calendar.planWeek')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => handleOpenAddRecipe(new Date())}
            className="w-10 h-10 flex items-center justify-center rounded-full text-ink hover:bg-sage/50 transition-colors"
            aria-label={t('calendar.addRecipe')}
          >
            <PlusIcon size={20} />
          </button>
        </div>
      }
    />
    <div className="flex-1 overflow-y-auto">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto max-w-6xl mx-auto w-full px-6 lg:px-8 py-4 pb-6">
        {pendingMeals.length > 0 && (
          <div className="mb-3 rounded-xl border border-herb/30 bg-sage/40 p-3 space-y-2">
            <p className="text-sm font-medium text-ink">
              {pendingMeals.length === 1
                ? t('calendar.didYouCook', { name: pendingMeals[0].meal_name })
                : t('calendar.pendingConfirm')}
            </p>
            <div className="space-y-2">
              {pendingMeals.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2 bg-surface/80 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{mealTitle(item)}</p>
                    <p className="text-xs text-muted">{item.serving_date} · {getMealTypeLabel(item.meal_type)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleConfirmMeal(item)}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-herb text-white hover:bg-herb-deep"
                    >
                      {t('calendar.markCooked')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSkipMeal(item)}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-line text-muted hover:bg-linen"
                    >
                      {t('calendar.didntCook')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* View Toggle */}
        <div className="bg-surface rounded-xl shadow-sm border border-line p-2 mb-2 mt-2">
          <div className="flex justify-between items-center mb-3">
            <div className="flex space-x-2">
              <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-xl flex items-center text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-herb text-white shadow-sm' : 'bg-linen text-muted'}`}>
                <CalendarIcon size={18} className="mr-1.5" />
                {t('calendar.calendarView')}
              </button>
              <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-xl flex items-center text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-herb text-white shadow-sm' : 'bg-linen text-muted'}`}>
                <ListIcon size={18} className="mr-1.5" />
                {t('calendar.listView')}
              </button>
            </div>
          </div>
          {isInitialLoading ? <Loading compact /> : viewMode === 'calendar' && <>
            <div className="flex justify-between items-center">
              <button onClick={previousMonth} className="p-2 rounded-xl hover:bg-linen text-ink active:bg-sage/40 transition-colors" aria-label="Previous month">
                <ChevronLeftIcon size={20} />
              </button>
              <h2 className="text-base font-semibold text-ink">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-linen text-ink active:bg-sage/40 transition-colors" aria-label="Next month">
                <ChevronRightIcon size={20} />
              </button>
            </div>
            {/* Calendar Grid */}
            <div className="mt-4">
              {/* Day names */}
              <div className="grid grid-cols-7 mb-1">
                {dayNames.map(day => <div key={day} className="text-center text-xs font-medium text-muted py-1">
                  {day}
                </div>)}
              </div>
              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const isToday = day === todayParts.date && currentMonth === todayParts.month && currentYear === todayParts.year;
                  const isSelected = selectedDate && day === selectedDate.getDate() && currentMonth === selectedDate.getMonth() && currentYear === selectedDate.getFullYear();

                  // Get meal types for this day
                  const dateString = day ? formatDateString(currentYear, currentMonth, day) : '';
                  const dayMeals = day ? mealsByDate.get(dateString) ?? noMeals : noMeals;
                  const hasMealTypes = mealTypePresence(dayMeals);
                  const dayInteractive = day
                    ? {
                        role: 'button' as const,
                        tabIndex: 0,
                        'aria-pressed': Boolean(isSelected),
                        'aria-label': [monthNames[currentMonth], day, dayMeals.length ? '(' + dayMeals.length + ')' : ''].join(' ').trim(),
                        onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleDayClick(day);
                          }
                        },
                      }
                    : {};
                  return <div key={index} {...dayInteractive} onClick={() => handleDayClick(day)} className={`
                          aspect-square lg:aspect-auto lg:min-h-[4.5rem] p-1.5 lg:p-2 relative flex flex-col justify-between
                          ${day ? 'cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-herb' : ''}
                          ${isSelected ? 'bg-sage/50 border-2 border-herb' : day ? 'bg-surface border border-line' : 'bg-transparent'}
                          ${isToday && !isSelected ? 'border-2 border-herb/50' : ''}
                          rounded-lg transition-all duration-150
                        `}>
                    {day && <>
                      <span className={`text-center text-sm lg:text-base ${isToday ? 'font-bold text-herb' : 'text-ink'} leading-none`}>
                        {day}
                      </span>
                      <div className="flex flex-col gap-0.5 mt-0.5 min-w-0">
                        {dayMeals.slice(0, 2).map((meal: MealPlan) => (
                          <p
                            key={meal.id}
                            className="hidden lg:block text-[10px] leading-tight text-ink truncate"
                            title={meal.meal_name}
                          >
                            {meal.meal_name}
                          </p>
                        ))}
                        {dayMeals.length > 2 ? (
                          <p className="hidden lg:block text-[10px] text-muted">+{dayMeals.length - 2}</p>
                        ) : null}
                        <div className="flex flex-col gap-0.5 lg:hidden">
                          {mealTypeOrder.map(type => hasMealTypes[type] ? <div key={type} className={`h-1 rounded-full ${getMealTypeIndicatorColor(type)}`} title={getMealTypeLabel(type)} /> : null)}
                        </div>
                      </div>
                    </>}
                  </div>;
                })}
              </div>
              {/* Meal type color legend */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-muted">
                {mealTypeOrder.map(type => <div key={type} className="flex items-center gap-1.5">
                  <span className={`w-3 h-1 rounded-full ${getMealTypeIndicatorColor(type)}`} />
                  <span>{getMealTypeLabel(type)}</span>
                </div>)}
              </div>
            </div>
          </>}
          {/* List View */}
          {!isInitialLoading && viewMode === 'list' && <div className="mt-2">
            {/* Week Navigation Controls */}
            <div className="flex justify-between items-center mb-3">
              <button onClick={goToPreviousWeek} className="flex items-center text-ink hover:text-ink px-2 py-1.5 rounded-lg hover:bg-linen active:bg-sage/40 text-sm">
                <ChevronLeftIcon size={16} className="mr-0.5" />
                {t('calendar.prev')}
              </button>
              <div className="flex items-center">
                <button onClick={goToCurrentWeek} className="px-3 py-1.5 text-xs rounded-lg bg-sage/50 text-herb border border-blue-100 hover:bg-sage active:bg-blue-200 font-medium">
                  {t('common.today')}
                </button>
                <span className="mx-2 text-sm font-medium text-ink">
                  {getWeekRangeDisplay()}
                </span>
              </div>
              <button onClick={goToNextWeek} className="flex items-center text-ink hover:text-ink px-2 py-1.5 rounded-lg hover:bg-linen active:bg-sage/40 text-sm">
                {t('calendar.next')}
                <ChevronRightIcon size={16} className="ml-0.5" />
              </button>
            </div>
            {weekShortages.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
                <p className="text-xs text-muted min-w-0 flex-1">
                  {(() => {
                    const { summary, extra } = formatShortageSummary(weekShortages);
                    if (!shortageRange) return t('calendar.missingSummary', { summary, extra });
                    const range = shortageRangeLabel(shortageRange.from, shortageRange.to, {
                      relative: key => t(`common.${key}`),
                      short: (d, withWeekday) =>
                        d.toLocaleDateString(dateLocale(i18n.language), {
                          ...(withWeekday ? { weekday: 'short' as const } : {}),
                          month: 'short',
                          day: 'numeric',
                        }),
                      range: (from, to) => t('calendar.planRange', { from, to }),
                    });
                    return t('calendar.missingSummaryRange', { range, summary, extra });
                  })()}
                </p>
                {shortagesNotOnList(weekShortages, shoppingList).length > 0 ? (
                  <button
                    type="button"
                    disabled={addingShopping}
                    onClick={() => void addShortagesToShopping(shortagesNotOnList(weekShortages, shoppingList))}
                    className="flex items-center gap-1.5 text-sm font-medium text-white bg-herb hover:bg-herb active:bg-herb-deep px-3 py-1.5 rounded-xl disabled:opacity-60"
                  >
                    <ShoppingCartIcon size={14} />
                    {t('calendar.addAllMissing')}
                  </button>
                ) : (
                  <span className="text-xs font-medium text-herb">{t('calendar.alreadyOnList')}</span>
                )}
              </div>
            )}
            {/* Week View */}
            <div className="space-y-2">
              {Object.entries(weekViewData).sort(([dateA], [dateB]) => parseLocalDate(dateA).getTime() - parseLocalDate(dateB).getTime()).map(([date, items]) => {
                const isExpanded = expandedDateGroups.includes(date);
                const hasItems = Array.isArray(items) && items.length > 0;
                return <div key={date} className="border border-line rounded-xl overflow-hidden bg-surface">
                  <div className={`px-3 py-2.5 flex justify-between items-center cursor-pointer active:bg-sage/40 transition-colors ${hasItems ? 'bg-linen' : 'bg-surface'}`} onClick={() => toggleDateGroupExpansion(date)}>
                    <div className="flex items-center">
                      <CalendarIcon size={16} className="text-muted mr-2" />
                      <h3 className="font-medium text-sm text-ink">
                        {formatDisplayDate(date)}
                      </h3>
                      {hasItems && <span className="ml-2 bg-sage text-herb-deep text-xs px-2 py-0.5 rounded-full font-medium">
                        {items.length}
                      </span>}
                    </div>
                    {hasItems && (isExpanded ? <ChevronUpIcon size={18} className="text-muted" /> : <ChevronDownIcon size={18} className="text-muted" />)}
                  </div>
                  {isExpanded && hasItems && <div className="divide-y divide-line">
                    {items.map((item: MealPlan) => {
                      const avail = availabilityByMealId[item.id];
                      const thumb = mealThumbUrl(item);
                      const actionKey = `${item.id}-${item.serving_date}-${item.meal_type}`;
                      return (
                        <div key={actionKey} className="p-3 hover:bg-linen">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-start flex-1 min-w-0 cursor-pointer" onClick={() => handleMealClick(item)}>
                              <div className="relative mr-2 flex-shrink-0">
                                {thumb ? (
                                  <img src={thumb} alt="" width={48} height={48} loading="lazy" decoding="async" className="w-12 h-12 rounded-lg object-cover border border-line" />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-sage/40 border border-line flex items-center justify-center">
                                    <ImageIcon size={18} className="text-muted" />
                                  </div>
                                )}
                                <span
                                  className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-surface ${stockLightClass(avail?.status)}`}
                                  title={stockLightTitle(avail?.status)}
                                  aria-label={stockLightTitle(avail?.status)}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getMealTypeIndicatorColor(item.meal_type)}`} />
                                  <p className="font-medium text-sm text-ink truncate">
                                    {mealTitle(item)}
                                  </p>
                                </div>
                                <p className="text-xs text-muted mt-0.5">
                                  {getMealTypeLabel(item.meal_type)}
                                  {item.status && item.status !== 'PLANNED' && (
                                    <>
                                      {' · '}
                                      {item.status === 'PENDING_CONFIRM' && t('calendar.statusPending')}
                                      {item.status === 'CONFIRMED' && t('calendar.statusCooked')}
                                      {item.status === 'SKIPPED' && t('calendar.statusDidntCook')}
                                    </>
                                  )}
                                </p>
                                {avail?.status === 'short' && avail.shortages.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs text-red-600">
                                      {(() => {
                                        const { summary, extra } = formatShortageSummary(avail.shortages);
                                        return t('calendar.missingSummary', { summary, extra });
                                      })()}
                                    </p>
                                    {shortagesNotOnList(avail.shortages, shoppingList).length > 0 && (
                                      <button
                                        type="button"
                                        disabled={addingShopping}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void addShortagesToShopping(shortagesNotOnList(avail.shortages, shoppingList));
                                        }}
                                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-herb hover:text-herb-deep"
                                      >
                                        <ShoppingCartIcon size={12} />
                                        {t('calendar.addMissingToShopping')}
                                      </button>
                                    )}
                                    {shortagesNotOnList(avail.shortages, shoppingList).length === 0 && (
                                      <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted" data-testid="on-shopping-list">
                                        <ShoppingCartIcon size={12} />
                                        {t('calendar.onShoppingList')}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="relative ml-1 flex-shrink-0">
                              <button onClick={e => {
                                e.stopPropagation();
                                toggleItemActions(actionKey);
                              }} className="p-2 rounded-full hover:bg-sage/50 active:bg-sage/60">
                                <MoreHorizontalIcon size={18} className="text-muted" />
                              </button>
                              {showItemActions === actionKey && <div className="absolute right-0 mt-1 w-40 bg-surface rounded-lg shadow-lg border border-line z-10">
                                {canActOnMeal(item) && <>
                                  <button onClick={e => {
                                    e.stopPropagation();
                                    handleConfirmMeal(item, e);
                                    setShowItemActions(null);
                                  }} className="w-full text-left px-3 py-2.5 text-sm text-ink hover:bg-sage/50 active:bg-sage flex items-center rounded-t-xl">
                                    <CheckIcon size={14} className="mr-2" />
                                    {t('calendar.markCooked')}
                                  </button>
                                  <button onClick={e => {
                                    e.stopPropagation();
                                    handleSkipMeal(item, e);
                                    setShowItemActions(null);
                                  }} className="w-full text-left px-3 py-2.5 text-sm text-muted hover:bg-sage/50 active:bg-sage flex items-center">
                                    <XIcon size={14} className="mr-2" />
                                    {t('calendar.didntCook')}
                                  </button>
                                </>}
                                <button onClick={e => {
                                  e.stopPropagation();
                                  handleDeleteRecipe(item);
                                  setShowItemActions(null);
                                }} className="w-full text-left px-3 py-2.5 text-sm text-herb hover:bg-sage/50 active:bg-sage flex items-center rounded-b-xl">
                                  <TrashIcon size={14} className="mr-2" />
                                  Remove
                                </button>
                              </div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>}
                  <div className="p-2 bg-linen flex justify-center border-t border-line">
                    <button onClick={e => {
                      e.stopPropagation();
                      const [year, month, day] = date.split('-').map(Number);
                      setSelectedDate(new Date(year, month - 1, day));
                      handleOpenAddRecipe(new Date(year, month - 1, day));
                    }} className="text-sm text-herb hover:text-herb-deep active:text-herb-deep flex items-center px-3 py-1.5 rounded-lg hover:bg-sage/50 active:bg-sage font-medium">
                      <PlusIcon size={14} className="mr-1" />
                      {t('calendar.addMeal')}
                    </button>
                  </div>
                </div>;
              })}
            </div>
          </div>}
        </div>
        {/* Selected Date History - Only show in calendar view */}
        {viewMode === 'calendar' && selectedDate && <div className="bg-surface rounded-2xl shadow-sm border border-line p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-semibold text-ink">
              {selectedDate.toLocaleDateString(dateLocale(i18n.language), {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </h3>
            <button onClick={() => handleOpenAddRecipe(selectedDate)} className="flex items-center text-sm bg-herb text-white px-3 py-1.5 rounded-xl hover:bg-herb active:bg-herb-deep transition-colors font-medium shadow-sm">
              <PlusIcon size={16} className="mr-1" />
              {t('common.add')}
            </button>
          </div>
          {selectedDayMeals.length > 0 ? <div>
            {Object.entries(historyByMealType).map(([type, meals]) => {
              if (meals.length === 0) return null;
              return <div key={type} className="mb-4 last:mb-0">
                <h4 className="text-sm font-medium text-ink mb-2">
                  {getMealTypeLabel(type)}:
                </h4>
                <div className="space-y-2">
                  {meals.map((item: MealPlan) => {
                    const avail = availabilityByMealId[item.id];
                    const thumb = mealThumbUrl(item);
                    return (
                      <div key={item.id} className={`p-4 rounded-xl border ${getMealTypeColor(type)} hover:shadow-md transition-shadow`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center min-w-0 flex-1 cursor-pointer" onClick={() => handleMealClick(item)}>
                            <div className="relative mr-2 flex-shrink-0">
                              {thumb ? (
                                <img src={thumb} alt="" width={40} height={40} loading="lazy" decoding="async" className="w-10 h-10 rounded-lg object-cover border border-line" />
                              ) : (
                                <div className={`w-1.5 h-1.5 rounded-full ${getMealTypeIndicatorColor(type)}`} />
                              )}
                              <span
                                className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-surface ${stockLightClass(avail?.status)}`}
                                title={stockLightTitle(avail?.status)}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-ink truncate">
                                {mealTitle(item)}
                              </p>
                              {item.status && item.status !== 'PLANNED' && (
                                <p className="text-xs text-muted">
                                  {item.status === 'PENDING_CONFIRM' && t('calendar.statusPending')}
                                  {item.status === 'CONFIRMED' && t('calendar.statusCooked')}
                                  {item.status === 'SKIPPED' && t('calendar.statusDidntCook')}
                                </p>
                              )}
                              {avail?.status === 'short' && shortagesNotOnList(avail.shortages, shoppingList).length > 0 && (
                                <button
                                  type="button"
                                  disabled={addingShopping}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void addShortagesToShopping(shortagesNotOnList(avail.shortages, shoppingList));
                                  }}
                                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-herb"
                                >
                                  <ShoppingCartIcon size={12} />
                                  {t('calendar.addMissingToShopping')}
                                </button>
                              )}
                              {avail?.status === 'short' && avail.shortages.length > 0 && shortagesNotOnList(avail.shortages, shoppingList).length === 0 && (
                                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted" data-testid="on-shopping-list">
                                  <ShoppingCartIcon size={12} />
                                  {t('calendar.onShoppingList')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {canActOnMeal(item) && (
                              <>
                                <button
                                  type="button"
                                  onClick={e => handleConfirmMeal(item, e)}
                                  className="p-1.5 rounded-full hover:bg-sage active:bg-sage text-herb transition-colors"
                                  aria-label={t('calendar.markCooked')}
                                  title={t('calendar.markCooked')}
                                >
                                  <CheckIcon size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={e => handleSkipMeal(item, e)}
                                  className="p-1.5 rounded-full hover:bg-sage active:bg-sage text-muted transition-colors"
                                  aria-label={t('calendar.didntCook')}
                                  title={t('calendar.didntCook')}
                                >
                                  <XIcon size={16} />
                                </button>
                              </>
                            )}
                            <button onClick={() => handleDeleteRecipe(item)} className="p-1.5 rounded-full hover:bg-sage active:bg-sage text-herb transition-colors" aria-label="Delete recipe">
                              <TrashIcon size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>;
            })}
          </div> : <div className="text-center py-6">
            <p className="text-muted">
              {t('calendar.noMealsForDate')}
            </p>
            <p className="text-muted text-sm mt-1">
              Cook something delicious today!
            </p>
          </div>}
        </div>}
      </main>
      {/* Notification Toast — always mounted (not only inside add modal) */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-[60] max-w-sm">
          <div className="flex items-start gap-3 bg-surface border border-line rounded-xl shadow-lg p-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-herb flex items-center justify-center">
              <CheckIcon size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink">
                {notificationMessage}
              </p>
              {notificationShortages && notificationShortages.length > 0 && (
                <button
                  type="button"
                  disabled={addingShopping}
                  onClick={() => void addShortagesToShopping(notificationShortages)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-herb hover:text-herb-deep disabled:opacity-60"
                >
                  <ShoppingCartIcon size={12} />
                  {t('calendar.addMissingToShopping')}
                </button>
              )}
            </div>
            <button
              onClick={() => {
                clearNotificationTimer();
                setShowNotification(false);
                setNotificationMessage('');
                setNotificationShortages(null);
              }}
              className="text-muted hover:text-ink transition"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>
      )}
      {/* Add Recipe Modal */}
      {showAddRecipeModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-surface rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-line flex justify-between items-center sticky top-0 bg-surface z-10 rounded-t-2xl">
            <h3 className="font-semibold text-ink text-base">
              {t('calendar.addToCalendar')}
            </h3>
            <button onClick={() => setShowAddRecipeModal(false)} className="p-1.5 rounded-full hover:bg-sage/50 active:bg-sage/60">
              <XIcon size={20} className="text-muted" />
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="meal-date" className="block text-sm font-medium text-ink mb-1.5">
                  {t('calendar.date')}
                </label>
                <input type="text" id="meal-date" value={selectedDate ? selectedDate.toLocaleDateString(dateLocale(i18n.language), {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                }) : new Date().toLocaleDateString(dateLocale(i18n.language), {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })} readOnly className="w-full p-3 bg-linen border border-line rounded-xl text-muted" />
              </div>
              <div>
                <label htmlFor="meal-type" className="block text-sm font-medium text-ink mb-1.5">
                  {t('calendar.mealType')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => <button key={type} type="button" onClick={() => setSelectedMealType(type)} className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${selectedMealType === type ? 'bg-herb border-herb text-white shadow-sm' : 'bg-surface border-line text-ink hover:bg-linen active:bg-sage/40'}`}>
                    {getMealTypeLabel(type)}
                  </button>)}
                </div>
              </div>
              <div>
                <label htmlFor="recipe-search" className="block text-sm font-medium text-ink mb-1.5">
                  {t('calendar.selectRecipe')}
                </label>
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SearchIcon size={16} className="text-muted" />
                    </div>
                    <input type="text" id="recipe-search" value={searchQuery} onChange={e => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                      setSelectedRecipeId('');
                    }} onClick={() => setIsDropdownOpen(true)} placeholder="Search for a recipe..." className="w-full pl-10 pr-10 py-3 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-herb/30 focus:border-transparent" />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ChevronDownIcon size={16} className="text-muted cursor-pointer" onClick={() => setIsDropdownOpen(!isDropdownOpen)} />
                    </div>
                  </div>
                  {isDropdownOpen && <div className="absolute z-10 mt-1 w-full bg-surface shadow-lg rounded-lg border border-line max-h-60 overflow-auto">
                    {filteredRecipes.length > 0 ? filteredRecipes.map(recipe => <div key={recipe.id} className="px-4 py-2 hover:bg-sage/50 cursor-pointer text-ink" onClick={() => handleSelectRecipe(recipe.id)}>
                      {recipe ? <div className="flex items-center">
                        <span>{recipe.meal_name}</span>
                      </div> : <div className="text-muted">Unknown Recipe</div>}
                    </div>) : <div className="px-4 py-3 text-muted text-center">
                      No recipes found
                    </div>}
                  </div>}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddRecipeModal(false)} className="w-1/2 bg-sage/40 text-ink py-2.5 rounded-xl font-medium text-sm hover:bg-sage/60 active:bg-sage transition-colors">
                  Cancel
                </button>
                <button onClick={handleSaveRecipe} disabled={!selectedRecipeId} className={`w-1/2 py-2.5 rounded-xl font-medium text-sm transition-colors ${selectedRecipeId ? 'bg-herb text-white hover:bg-herb active:bg-herb-deep shadow-sm' : 'bg-sage/60 text-muted cursor-not-allowed'}`}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>}
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-surface rounded-xl shadow-lg max-w-sm w-full">
          <div className="p-5">
            <div className="flex items-center text-herb mb-3">
              <AlertCircleIcon size={24} className="mr-2" />
              <h3 className="text-base font-semibold">{t('calendar.confirmDeletion')}</h3>
            </div>
            <p className="text-muted mb-5 text-sm">
              {t('calendar.deleteMealConfirm')}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirmation(false)} className="px-4 py-2 bg-sage/40 hover:bg-sage/60 active:bg-sage text-ink rounded-xl transition-colors font-medium text-sm">
                {t('common.cancel')}
              </button>
              <button onClick={confirmDeleteRecipe} className="px-4 py-2 bg-herb hover:bg-herb active:bg-herb-deep text-white rounded-xl transition-colors font-medium text-sm shadow-sm">
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      </div>}
      {showRecipeDetailModal && selectedRecipeForDetail && <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
        <div className="bg-surface rounded-t-3xl sm:rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="sticky top-0 bg-surface border-b border-line z-10">
            <div className="p-5 flex justify-between items-start">
              <div className="flex-1 min-w-0 mr-4">
                <h2 className="text-2xl font-bold text-ink truncate">
                  {selectedRecipeForDetail.meal_name}
                </h2>
              </div>
              <button onClick={() => {
                setShowRecipeDetailModal(false);
                setSelectedRecipeForDetail(null);
              }} className="p-2 rounded-full hover:bg-sage/50 active:bg-sage/60 flex-shrink-0" aria-label="Close">
                <XIcon size={24} className="text-muted" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Recipe Image */}
            {selectedRecipeForDetail.image?.url ? (
              <div className="w-full h-64 relative">
                <img src={selectedRecipeForDetail.image.url} alt={selectedRecipeForDetail.meal_name || 'Recipe'} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>
            ) : null}

            <div className="p-6 space-y-6">
              {/* Ingredients Section */}
              <div>
                <h3 className="text-lg font-semibold text-ink mb-4 flex items-center">
                  <PackageIcon size={20} className="mr-2 text-herb" />
                  Ingredients
                </h3>
                <div className="bg-linen rounded-xl p-4 space-y-3">
                  {(selectedRecipeForDetail.ingredients?.length ?? 0) > 0 ? (
                    selectedRecipeForDetail.ingredients.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-line last:border-b-0">
                        <div className="flex items-center flex-1">
                          <div className="w-2 h-2 rounded-full bg-herb mr-3"></div>
                          <div>
                            <span className="font-medium text-ink capitalize">
                              {item.name}
                            </span>
                            <span className="text-sm text-muted ml-2">
                              {item.quantity && item.unit ? `(${item.quantity} ${item.unit})` : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted">No ingredients listed for this recipe.</p>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <h3 className="text-lg font-semibold text-ink mb-4">Instructions</h3>
                {(selectedRecipeForDetail.instructions?.length ?? 0) > 0 ? (
                  <ol className="space-y-3">
                    {splitInstructionSteps(selectedRecipeForDetail.instructions).map((step, index) => (
                      <li key={index} className="flex">
                        <div className="bg-sage rounded-full w-6 h-6 flex items-center justify-center text-herb-deep font-medium mr-3 flex-shrink-0 mt-0.5 text-sm">
                          {index + 1}
                        </div>
                        <p className="text-ink">{step}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted">No instructions available for this recipe.</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-surface border-t border-line p-4">
            <button onClick={() => {
              setShowRecipeDetailModal(false);
              setSelectedRecipeForDetail(null);
            }} className="w-full bg-sage/40 hover:bg-sage/60 active:bg-sage text-ink font-medium py-3 rounded-xl transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>}

    </div></div>;
}