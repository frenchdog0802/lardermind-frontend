import React, { useState, createContext, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createDedupedFetcher, type DedupedFetcher } from '../utils/dedupedFetch';
import { PantryItem, ShoppingListItem, Recipe, Folder, UserSettings, IngredientEntry, MealPlan, ApiResponse, ConfirmMealPlanResult } from '../api/types';
import { recipeApi } from '../api/recipes';
import { folderApi } from '../api/folder';
import { PantryItemApi, parsePantryItem, parsePantryItems } from '../api/pantryItem';
import { ingredientApi } from "../api/ingredient";
import {
  parseShoppingListItem,
  parseShoppingListItems,
  parseSyncResult,
  parseUnsyncResult,
  readShoppingVersionConflict,
  shoppingListApi,
} from '../api/shoppingList';
import { mergeShoppingWrite } from '../api/shoppingSync';
import { mealPlanApi } from '../api/mealPlan';
import { userPreferencesApi } from '../api/userPreferences';
import i18n, { matchSupportedLanguage, resolveStoredLanguage } from '../i18n';
import { useAuth } from './authContext';
import { splitInstructionSteps } from '../utils/recipeSteps';

function unwrapListResponse<T>(data: T[] | Record<string, T[] | undefined>, key: string): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  const list = data[key];
  return Array.isArray(list) ? list : [];
}

function normalizeInstructions(raw: unknown, stepsFallback?: unknown): string[] {
  if (Array.isArray(raw)) {
    return splitInstructionSteps(raw);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return splitInstructionSteps(raw);
  }
  if (Array.isArray(stepsFallback)) {
    return splitInstructionSteps(stepsFallback);
  }
  return [];
}

function normalizeRecipeImage(raw: unknown): Recipe['image'] | null {
  if (!raw || typeof raw !== 'object') return null;
  const image = raw as { url?: string; public_id?: string };
  const url = typeof image.url === 'string' ? image.url.trim() : '';
  if (!url) return null;
  return {
    url,
    public_id: typeof image.public_id === 'string' ? image.public_id : '',
  };
}

export function normalizeRecipe(raw: Record<string, unknown> | Recipe): Recipe {
  const r = raw as Record<string, unknown>;

  return {
    ...(raw as Recipe),
    id: String(r.id ?? ''),
    meal_name: String(r.meal_name ?? r.mealName ?? ''),
    folder_id: r.folder_id != null || r.folderId != null
      ? String(r.folder_id ?? r.folderId)
      : '',
    instructions: normalizeInstructions(r.instructions, r.steps),
    ingredients: Array.isArray(r.ingredients) ? (r.ingredients as Recipe['ingredients']) : [],
    image: normalizeRecipeImage(r.image) as Recipe['image'],
  };
}

/** Backend expects instructions as a single string. */
function serializeRecipeForApi(recipe: Partial<Recipe>): Record<string, unknown> {
  const instructions = recipe.instructions;
  return {
    ...recipe,
    instructions: Array.isArray(instructions)
      ? instructions.filter(Boolean).join('\n')
      : instructions ?? '',
    image: recipe.image?.url ? recipe.image : null,
  };
}

function normalizeMealPlan(raw: Record<string, unknown> | MealPlan): MealPlan {
  const record = raw as Record<string, unknown>;
  const statusRaw = String(record.status ?? 'PLANNED').toUpperCase();
  const status = (['PLANNED', 'PENDING_CONFIRM', 'CONFIRMED', 'SKIPPED'].includes(statusRaw)
    ? statusRaw
    : 'PLANNED') as MealPlan['status'];
  return {
    id: String(record.id ?? ''),
    recipe_id: String(record.recipe_id ?? record.recipeId ?? ''),
    meal_type: (record.meal_type ?? record.mealType ?? 'dinner') as MealPlan['meal_type'],
    serving_date: String(record.serving_date ?? record.servingDate ?? ''),
    meal_name: String(record.meal_name ?? record.mealName ?? ''),
    image: (record.image as string | null | undefined)
      ?? ((record.image_url as { url?: string } | undefined)?.url ?? null),
    status,
  };
}

/** `force: true` skips the in-flight/30 s cache (use after a mutation or an explicit refresh). */
export interface FetchOptions {
  force?: boolean;
}

/** State mirrored in a ref so stable callbacks can read the latest value (for rollbacks). */
function useRefState<T>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const ref = useRef<T>(initial);
  const commit = useCallback((next: T | ((prev: T) => T)) => {
    const value = typeof next === 'function' ? (next as (prev: T) => T)(ref.current) : next;
    ref.current = value;
    setState(value);
  }, []);
  return [state, commit, ref] as const;
}

function useDedupedFetcher<T>(load: () => Promise<T>): DedupedFetcher<T> {
  const ref = useRef<DedupedFetcher<T> | null>(null);
  if (!ref.current) ref.current = createDedupedFetcher(load);
  return ref.current;
}

interface PantryContextType {
  recipes: Recipe[];
  recipesLoading: boolean;
  fetchAllRecipes: (opts?: FetchOptions) => Promise<Recipe[]>;
  addRecipe: (Recipe: Recipe) => void;
  updateRecipe: (Recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;
  userSettings: UserSettings;
  updateUserSettings: (settings: UserSettings) => void;
  folders: Folder[];
  fetchAllFolders: (opts?: FetchOptions) => Promise<void>;
  addFolder: (folder: Folder) => Promise<void>;
  deleteFolder: (id: string) => void;
  updateFolder: (folder: Folder) => void;
  // createInitFolders: (folders: Folder[]) => void;

  // pantry items
  pantryItems: PantryItem[];
  fetchAllPantryItems: (opts?: FetchOptions) => Promise<PantryItem[]>;
  updatePantryItem: (item: PantryItem) => void;
  updatePantryItems: (items: PantryItem[]) => void;
  addPantryItem: (item: Omit<PantryItem, 'id'>) => void;
  removePantryItem?: (id: string) => void;

  // ingredients
  fetchAllIngredients: (query: string | null) => void;
  ingredients: IngredientEntry[];
  updateIngredients?: (item: IngredientEntry) => void;

  // shopping List
  shoppingList: ShoppingListItem[];
  fetchAllShoppingListItems: (opts?: FetchOptions) => Promise<ShoppingListItem[]>;
  updateShoppingListItem: (item: ShoppingListItem) => Promise<ApiResponse<ShoppingListItem>>;
  addShoppingListItem: (item: Omit<ShoppingListItem, 'id'>) => void;
  removeShoppingListItem?: (id: string) => Promise<ApiResponse<ShoppingListItem | null>>;
  syncShoppingItemsToPantry: (
    items: Array<{ id: string; quantity?: number; unit?: string }>,
  ) => Promise<ApiResponse<{ synced: ShoppingListItem[]; skipped: Array<{ id: string; reason: string }> }>>;
  unsyncShoppingItemsFromPantry: (
    itemIds: string[],
  ) => Promise<ApiResponse<{ unsynced: ShoppingListItem[]; skipped: Array<{ id: string; reason: string }> }>>;

  // meal plans
  mealPlan: MealPlan[];
  mealPlansLoading: boolean;
  fetchAllMealPlans: (opts?: FetchOptions) => Promise<MealPlan[]>;
  addMealPlan: (mealPlan: MealPlan) => Promise<ApiResponse<MealPlan>>;
  updateMealPlan: (mealPlan: MealPlan) => void;
  deleteMealPlan: (id: string) => void;
  confirmMealPlan: (id: string) => Promise<ApiResponse<ConfirmMealPlanResult>>;
  skipMealPlan: (id: string) => Promise<ApiResponse<{ mealPlan: MealPlan; alreadySkipped: boolean }>>;
  fetchPendingConfirmations: () => Promise<MealPlan[]>;
}

const PantryContext = createContext<PantryContextType | undefined>(undefined);
export function PantryProvider({
  children
}: {
  children: React.ReactNode;
}) {
  // meal plan state
  const [mealPlan, setMealPlan, mealPlanRef] = useRefState<MealPlan[]>([]);
  // ingredient state
  const [ingredients, setIngredients, ingredientsRef] = useRefState<IngredientEntry[]>([]);
  // folder state
  const [folders, setFolders, foldersRef] = useRefState<Folder[]>([]);
  // main state
  const [pantryItems, setPantryItems, pantryItemsRef] = useRefState<PantryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const shoppingListRef = useRef<ShoppingListItem[]>([]);
  const shoppingQueueRef = useRef(new Map<string, Promise<unknown>>());

  const commitShoppingList = useCallback((updater: (prev: ShoppingListItem[]) => ShoppingListItem[]) => {
    const next = updater(shoppingListRef.current);
    shoppingListRef.current = next;
    setShoppingList(next);
  }, []);

  const enqueueShoppingWrite = useCallback(<T,>(id: string, task: () => Promise<T>): Promise<T> => {
    const previous = shoppingQueueRef.current.get(id) ?? Promise.resolve();
    const run = previous.then(task, task);
    shoppingQueueRef.current.set(id, run);
    void run.finally(() => {
      if (shoppingQueueRef.current.get(id) === run) {
        shoppingQueueRef.current.delete(id);
      }
    });
    return run;
  }, []);
  const [recipes, setRecipes, recipesRef] = useRefState<Recipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [mealPlansLoading, setMealPlansLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const mutationErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifyMutationError = useCallback((message: string) => {
    setMutationError(message);
    if (mutationErrorTimer.current) clearTimeout(mutationErrorTimer.current);
    mutationErrorTimer.current = setTimeout(() => setMutationError(null), 5000);
  }, []);
  useEffect(
    () => () => {
      if (mutationErrorTimer.current) clearTimeout(mutationErrorTimer.current);
    },
    [],
  );
  const tRef = useRef(t);
  tRef.current = t;

  /**
   * Runs an optimistic server write. On a thrown error or an unsuccessful response the
   * caller's rollback restores the previous state and an error toast is shown.
   */
  const runOptimisticWrite = useCallback(
    async (
      call: () => Promise<ApiResponse<unknown> | undefined>,
      rollback: () => void,
      opts: { okCodes?: string[] } = {},
    ): Promise<boolean> => {
      try {
        const res = await call();
        if (res && res.success === false && !(res.code && opts.okCodes?.includes(res.code))) {
          rollback();
          notifyMutationError(res.message || tRef.current('common.saveFailed'));
          return false;
        }
        return true;
      } catch (err) {
        console.error('Write failed:', err);
        rollback();
        notifyMutationError(tRef.current('common.saveFailed'));
        return false;
      }
    },
    [notifyMutationError],
  );

  const [userSettings, setUserSettings] = useState<UserSettings>({
    name: '',
    language: resolveStoredLanguage(),
    measurement_unit: 'metric'
  });

  useEffect(() => {
    // Keep userSettings.language in sync with every language change (header switcher or Settings).
    const onChange = (lng: string) => {
      const next = matchSupportedLanguage(lng) ?? 'en';
      setUserSettings(prev => (prev.language === next ? prev : { ...prev, language: next }));
    };
    i18n.on('languageChanged', onChange);
    return () => {
      i18n.off('languageChanged', onChange);
    };
  }, []);

  useEffect(() => {
    // Preferences are per-user; never call the authenticated endpoint while logged out.
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const prefs = await userPreferencesApi.get();
        if (!cancelled && prefs?.measurementUnit) {
          setUserSettings(prev => ({
            ...prev,
            measurement_unit: prefs.measurementUnit,
          }));
        }
      } catch (err) {
        console.error('Load measurement preference failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const foldersFetcher = useDedupedFetcher(async () => {
    const res = await folderApi.list();
    if (!res?.success || !res.data) throw new Error('Fetch folders failed');
    setFolders(unwrapListResponse(res.data, 'folders'));
  });
  const fetchAllFolders = useCallback(async (opts?: FetchOptions) => {
    try {
      await foldersFetcher.run({ force: opts?.force === true });
    } catch (err) {
      console.error('Fetch folders failed:', err);
    }
  }, [foldersFetcher]);


  const addFolder = useCallback(async (folder: Folder) => {
    const tempFolder: Folder = {
      ...folder
    };

    setFolders(prev => [...prev, tempFolder]);

    try {
      const savedFolderResponse = await folderApi.create(folder);
      if (savedFolderResponse && savedFolderResponse.data && savedFolderResponse.success) {
        const payload = savedFolderResponse.data as Folder | { folder?: Folder };
        const savedFolder = (payload && typeof payload === 'object' && 'folder' in payload && payload.folder)
          ? payload.folder
          : payload as Folder;
        if (savedFolder?.id) {
          setFolders(prev =>
            prev.map(f => (f.id === tempFolder.id || f.name === tempFolder.name ? savedFolder : f))
          );
        } else {
          await fetchAllFolders({ force: true });
        }
      }
    } catch (err) {
      console.error('Insert folder failed:', err);
      setFolders(prev => prev.filter(f => f.id !== tempFolder.id));
    }
  }, [fetchAllFolders, setFolders]);
  const deleteFolder = useCallback((id: string) => {
    const snapshot = foldersRef.current;
    setFolders(prev => prev.filter(f => f.id !== id));
    void runOptimisticWrite(() => folderApi.delete(id), () => setFolders(snapshot), { okCodes: ['not_found'] });
  }, [foldersRef, runOptimisticWrite, setFolders]);

  const updateFolder = useCallback((folder: Folder) => {
    const previous = foldersRef.current.find(f => f.id === folder.id);
    setFolders(prev => prev.map(f => f.id === folder.id ? folder : f));
    void runOptimisticWrite(
      () => folderApi.update(folder.id, folder),
      () => { if (previous) setFolders(prev => prev.map(f => f.id === previous.id ? previous : f)); },
    );
  }, [foldersRef, runOptimisticWrite, setFolders]);


  const recipesFetcher = useDedupedFetcher(async () => {
    setRecipesLoading(true);
    try {
      const res = await recipeApi.list();
      if (!res?.success || !res.data) throw new Error('Fetch recipes failed');
      const data = res.data as Recipe[] | { recipes?: Recipe[] };
      const recipesList = unwrapListResponse(data, 'recipes').map(recipe =>
        normalizeRecipe(recipe as unknown as Record<string, unknown>)
      );
      setRecipes(recipesList);
      return recipesList;
    } finally {
      setRecipesLoading(false);
    }
  });
  const fetchAllRecipes = useCallback(async (opts?: FetchOptions): Promise<Recipe[]> => {
    try {
      return await recipesFetcher.run({ force: opts?.force === true });
    } catch (err) {
      console.error('Fetch recipes failed:', err);
    }
    return [];
  }, [recipesFetcher]);
  const addRecipe = useCallback(async (recipe: Recipe) => {
    // temporary recipe for optimistic UI
    const tempRecipe: Recipe = {
      ...recipe,
      instructions: normalizeInstructions(recipe.instructions),
      image: normalizeRecipeImage(recipe.image) as Recipe['image'],
    };

    setRecipes(prev => [...prev, tempRecipe]);

    try {
      const savedRecipeResponse = await recipeApi.create(serializeRecipeForApi(recipe) as Partial<Recipe>);
      if (savedRecipeResponse && savedRecipeResponse.data && savedRecipeResponse.success) {
        const raw = savedRecipeResponse.data as unknown;
        const payload = (raw && typeof raw === 'object' && 'recipe' in (raw as object)
          ? (raw as { recipe: Record<string, unknown> }).recipe
          : raw) as Record<string, unknown>;
        const savedRecipe = normalizeRecipe(payload);

        // replace temp with the one from backend
        setRecipes(prev =>
          prev.map(r => (r.id === tempRecipe.id ? savedRecipe : r))
        );
      }
    } catch (err) {
      console.error('Insert recipe failed:', err);
      // rollback if needed
      setRecipes(prev => prev.filter(r => r.id !== tempRecipe.id));
    }
  }, [setRecipes]);
  const updateRecipe = useCallback((recipe: Recipe) => {
    const normalized = {
      ...recipe,
      instructions: normalizeInstructions(recipe.instructions),
      image: normalizeRecipeImage(recipe.image) as Recipe['image'],
    };
    // optimistic update
    const previous = recipesRef.current.find(r => r.id === recipe.id);
    setRecipes(prev => prev.map(r => r.id === recipe.id ? normalized : r));

    void runOptimisticWrite(
      () => recipeApi.update(recipe.id, serializeRecipeForApi(normalized) as Partial<Recipe>),
      () => {
        if (previous) setRecipes(prev => prev.map(r => r.id === previous.id ? previous : r));
        else void fetchAllRecipes({ force: true });
      },
    );
  }, [fetchAllRecipes, recipesRef, runOptimisticWrite, setRecipes]);
  const deleteRecipe = useCallback((id: string) => {
    const snapshot = recipesRef.current;
    setRecipes(prev => prev.filter(r => r.id !== id));
    void runOptimisticWrite(() => recipeApi.delete(id), () => setRecipes(snapshot), { okCodes: ['not_found'] });
  }, [recipesRef, runOptimisticWrite, setRecipes]);
  const updateUserSettings = useCallback((settings: UserSettings) => {
    setUserSettings(settings);
  }, []);

  const pantryFetcher = useDedupedFetcher(async () => {
    const res = await PantryItemApi.list();
    if (!res?.success || !res.data) throw new Error('Fetch pantry items failed');
    const list = parsePantryItems(res.data);
    setPantryItems(list);
    return list;
  });
  const fetchAllPantryItems = useCallback(async (opts?: FetchOptions): Promise<PantryItem[]> => {
    try {
      return await pantryFetcher.run({ force: opts?.force === true });
    } catch (err) {
      console.error('Fetch pantry items failed:', err);
    }
    return [];
  }, [pantryFetcher]);
  const inflightPantryAddsRef = useRef(new Set<string>());
  const addPantryItem = useCallback(async (item: Omit<PantryItem, 'id'>) => {
    // duplicate-submit guard: an identical add that is still in flight is ignored
    const submitKey = JSON.stringify(item);
    if (inflightPantryAddsRef.current.has(submitKey)) return;
    inflightPantryAddsRef.current.add(submitKey);
    // temporary item for optimistic UI
    const tempItem: PantryItem = {
      ...item,
      id: `pantry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };

    setPantryItems(prev => [...prev, tempItem]);

    try {
      const savedItemResponse = await PantryItemApi.create(item);
      if (savedItemResponse && savedItemResponse.data && savedItemResponse.success) {
        const savedItem = parsePantryItem(savedItemResponse.data);

        if (savedItem) {
          // replace temp with the one from backend
          setPantryItems(prev =>
            prev.map(i => (i.id === tempItem.id ? savedItem : i))
          );
        } else {
          setPantryItems(prev => prev.filter(i => i.id !== tempItem.id));
        }
      } else {
        setPantryItems(prev => prev.filter(i => i.id !== tempItem.id));
      }
    } catch (err) {
      console.error('Insert pantry item failed:', err);
      // rollback if needed
      setPantryItems(prev => prev.filter(i => i.id !== tempItem.id));
    } finally {
      inflightPantryAddsRef.current.delete(submitKey);
    }
  }, [inflightPantryAddsRef, setPantryItems]);
  const updatePantryItem = useCallback((item: PantryItem) => {
    const previous = pantryItemsRef.current.find(i => i.id === item.id);
    setPantryItems(prev => prev.map(i => i.id === item.id ? item : i));
    void runOptimisticWrite(
      () => PantryItemApi.update(item.id, item),
      () => { if (previous) setPantryItems(prev => prev.map(i => i.id === previous.id ? previous : i)); },
    );
  }, [pantryItemsRef, runOptimisticWrite, setPantryItems]);
  const updatePantryItems = useCallback((items: PantryItem[]) => {
    const snapshot = pantryItemsRef.current;
    setPantryItems(items);
    void runOptimisticWrite(() => PantryItemApi.updateMany(items), () => setPantryItems(snapshot));
  }, [pantryItemsRef, runOptimisticWrite, setPantryItems]);

  const removePantryItem = useCallback((id: string) => {
    const snapshot = pantryItemsRef.current;
    setPantryItems(prev => prev.filter(i => i.id !== id));
    void runOptimisticWrite(() => PantryItemApi.delete(id), () => setPantryItems(snapshot), { okCodes: ['not_found'] });
  }, [pantryItemsRef, runOptimisticWrite, setPantryItems]);

  // fetch ingredients with optional query
  const fetchAllIngredients = useCallback(async (query: string | null) => {
    try {
      const fetchedIngredientsResponse = await ingredientApi.list(query || undefined);
      if (fetchedIngredientsResponse?.success && fetchedIngredientsResponse.data) {
        setIngredients(unwrapListResponse(fetchedIngredientsResponse.data, 'ingredients'));
      }
    } catch (err) {
      console.error('Fetch ingredients failed:', err);
    }
  }, [setIngredients]);
  const updateIngredients = useCallback((item: IngredientEntry) => {
    const previous = ingredientsRef.current.find(i => i.id === item.id);
    setIngredients(prev => prev.map(i => i.id === item.id ? item : i));
    void runOptimisticWrite(
      () => ingredientApi.update(item.id, item),
      () => { if (previous) setIngredients(prev => prev.map(i => i.id === previous.id ? previous : i)); },
    );
  }, [ingredientsRef, runOptimisticWrite, setIngredients]);

  // shopping list item functions
  const shoppingFetcher = useDedupedFetcher(async () => {
    const res = await shoppingListApi.list();
    if (!res || !res.data || !res.success) throw new Error('Fetch shopping list items failed');
    const fetchedItems = parseShoppingListItems(res.data);
    commitShoppingList(() => fetchedItems);
    return fetchedItems;
  });
  const fetchAllShoppingListItems = useCallback(async (opts?: FetchOptions): Promise<ShoppingListItem[]> => {
    try {
      return await shoppingFetcher.run({ force: opts?.force === true });
    } catch (err) {
      console.error('Fetch shopping list items failed:', err);
    }
    return [];
  }, [shoppingFetcher]);
  const inflightShoppingAddsRef = useRef(new Set<string>());
  const updateShoppingListItem = useCallback((item: ShoppingListItem) => {
    const baseline = shoppingListRef.current.find((entry) => entry.id === item.id);
    return enqueueShoppingWrite(item.id, async () => {
      const current = shoppingListRef.current.find((entry) => entry.id === item.id) ?? item;
      const merged = mergeShoppingWrite(baseline, item, current);
      if (merged.action === 'keep') {
        return { success: true, data: merged.item } satisfies ApiResponse<ShoppingListItem>;
      }
      if (merged.action === 'conflict') {
        commitShoppingList((prev) => prev.map((entry) => (entry.id === item.id ? merged.item : entry)));
        return {
          success: false,
          code: 'version_conflict',
          message: 'Version conflict',
          data: merged.item,
        } satisfies ApiResponse<ShoppingListItem>;
      }

      commitShoppingList((prev) => prev.map((entry) => (entry.id === item.id ? merged.item : entry)));
      const response = await shoppingListApi.update(item.id, merged.item);
      if (response.success && response.data) {
        const saved = parseShoppingListItem(response.data) ?? merged.item;
        commitShoppingList((prev) => prev.map((entry) => (entry.id === item.id ? saved : entry)));
        return { ...response, data: saved };
      }

      const serverCurrent = readShoppingVersionConflict(response);
      if (serverCurrent) {
        const retry = mergeShoppingWrite(baseline ?? current, item, serverCurrent);
        if (retry.action === 'send') {
          const retried = await shoppingListApi.update(item.id, retry.item);
          if (retried.success && retried.data) {
            const saved = parseShoppingListItem(retried.data) ?? retry.item;
            commitShoppingList((prev) => prev.map((entry) => (entry.id === item.id ? saved : entry)));
            return { ...retried, data: saved };
          }
          const again = readShoppingVersionConflict(retried) ?? serverCurrent;
          commitShoppingList((prev) => prev.map((entry) => (entry.id === item.id ? again : entry)));
          return {
            success: false,
            code: 'version_conflict',
            message: retried.message ?? 'Version conflict',
            data: again,
          } satisfies ApiResponse<ShoppingListItem>;
        }
        const resolved = retry.action === 'keep' ? retry.item : serverCurrent;
        commitShoppingList((prev) => prev.map((entry) => (entry.id === item.id ? resolved : entry)));
        if (retry.action === 'keep') {
          return { success: true, data: resolved } satisfies ApiResponse<ShoppingListItem>;
        }
        return {
          success: false,
          code: 'version_conflict',
          message: response.message ?? 'Version conflict',
          data: resolved,
        } satisfies ApiResponse<ShoppingListItem>;
      }

      commitShoppingList((prev) => prev.map((entry) => (entry.id === item.id ? current : entry)));
      return response as ApiResponse<ShoppingListItem>;
    });
  }, [commitShoppingList, enqueueShoppingWrite]);

  const addShoppingListItem = useCallback(async (item: Omit<ShoppingListItem, 'id'>) => {
    // duplicate-submit guard: an identical add that is still in flight is ignored
    const submitKey = JSON.stringify(item);
    if (inflightShoppingAddsRef.current.has(submitKey)) return;
    inflightShoppingAddsRef.current.add(submitKey);
    // temporary item for optimistic UI
    const tempItem: ShoppingListItem = {
      ...item,
      id: `shopping-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      checked: false
    };

    commitShoppingList((prev) => [tempItem, ...prev]);

    try {
      const savedItemResponse = await shoppingListApi.create(item);
      if (savedItemResponse && savedItemResponse.data && savedItemResponse.success) {
        const savedItem = parseShoppingListItem(savedItemResponse.data);

        if (savedItem) {
          // replace temp with the one from backend
          commitShoppingList((prev) =>
            prev.map(i => (i.id === tempItem.id ? savedItem : i))
          );
        } else {
          commitShoppingList((prev) => prev.filter(i => i.id !== tempItem.id));
        }
      } else {
        // rollback if response is invalid
        commitShoppingList((prev) => prev.filter(i => i.id !== tempItem.id));
      }
    } catch (err) {
      console.error('Insert shopping list item failed:', err);
      // rollback if needed
      commitShoppingList((prev) => prev.filter(i => i.id !== tempItem.id));
    } finally {
      inflightShoppingAddsRef.current.delete(submitKey);
    }
  }, [commitShoppingList, inflightShoppingAddsRef]);
  const removeShoppingListItem = useCallback((id: string) => {
    return enqueueShoppingWrite(id, async () => {
      const previous = shoppingListRef.current.find((entry) => entry.id === id);
      commitShoppingList((prev) => prev.filter((entry) => entry.id !== id));
      try {
        const response = await shoppingListApi.delete(id, previous?.version);
        if (response.success || response.code === 'not_found') {
          return response as ApiResponse<ShoppingListItem | null>;
        }
        const current = readShoppingVersionConflict(response);
        if (current) {
          commitShoppingList((prev) =>
            prev.some((entry) => entry.id === current.id)
              ? prev.map((entry) => (entry.id === current.id ? current : entry))
              : [current, ...prev],
          );
          return {
            success: false,
            code: 'version_conflict',
            message: response.message ?? 'Version conflict',
            data: current,
          } satisfies ApiResponse<ShoppingListItem | null>;
        }
        if (previous) {
          commitShoppingList((prev) => [previous, ...prev.filter((entry) => entry.id !== id)]);
        }
        return response as ApiResponse<ShoppingListItem | null>;
      } catch (err) {
        console.error('Delete shopping list item failed:', err);
        if (previous) {
          commitShoppingList((prev) => [previous, ...prev.filter((entry) => entry.id !== id)]);
        }
        return { success: false, message: 'Delete failed' } satisfies ApiResponse<ShoppingListItem | null>;
      }
    });
  }, [commitShoppingList, enqueueShoppingWrite]);

  const syncShoppingItemsToPantry = useCallback(async (
    items: Array<{ id: string; quantity?: number; unit?: string }>,
  ) => {
    const response = await shoppingListApi.syncToPantry(items);
    if (response.success && response.data) {
      const result = parseSyncResult(response.data);
      const byId = new Map(result.synced.map(i => [i.id, i]));
      commitShoppingList((prev) =>
        prev.map(item => {
          const synced = byId.get(item.id);
          return synced ? { ...item, ...synced, synced_to_pantry: true } : item;
        }),
      );
      // The sync/unsync response does not carry pantry rows, so refresh them, but do not
      // make the caller (toast, Undo) wait for it.
      void fetchAllPantryItems({ force: true });
      return { ...response, data: result };
    }
    return response as ApiResponse<{
      synced: ShoppingListItem[];
      skipped: Array<{ id: string; reason: string }>;
    }>;
  }, [commitShoppingList, fetchAllPantryItems]);

  const unsyncShoppingItemsFromPantry = useCallback(async (itemIds: string[]) => {
    const response = await shoppingListApi.unsyncFromPantry(itemIds);
    if (response.success && response.data) {
      const result = parseUnsyncResult(response.data);
      const byId = new Map(result.unsynced.map(i => [i.id, i]));
      commitShoppingList((prev) =>
        prev.map(item => {
          const unsynced = byId.get(item.id);
          return unsynced
            ? { ...item, ...unsynced, synced_to_pantry: false }
            : item;
        }),
      );
      // The sync/unsync response does not carry pantry rows, so refresh them, but do not
      // make the caller (toast, Undo) wait for it.
      void fetchAllPantryItems({ force: true });
      return { ...response, data: result };
    }
    return response as ApiResponse<{
      unsynced: ShoppingListItem[];
      skipped: Array<{ id: string; reason: string }>;
    }>;
  }, [commitShoppingList, fetchAllPantryItems]);

  // meal plan functions
  const mealPlansFetcher = useDedupedFetcher(async () => {
    setMealPlansLoading(true);
    try {
      const res = await mealPlanApi.list();
      if (!res?.success || !res.data) throw new Error('Fetch meal plans failed');
      const data = res.data as MealPlan[] | { mealPlans?: MealPlan[] };
      const mealPlansList = unwrapListResponse(data, 'mealPlans').map(plan =>
        normalizeMealPlan(plan as unknown as Record<string, unknown>)
      );
      setMealPlan(mealPlansList);
      return mealPlansList;
    } finally {
      setMealPlansLoading(false);
    }
  });
  const fetchAllMealPlans = useCallback(async (opts?: FetchOptions): Promise<MealPlan[]> => {
    try {
      return await mealPlansFetcher.run({ force: opts?.force === true });
    } catch (err) {
      console.error('Fetch meal plans failed:', err);
    }
    return [];
  }, [mealPlansFetcher]);
  const addMealPlan = useCallback(async (mealPlan: MealPlan): Promise<ApiResponse<MealPlan>> => {
    // temporary meal plan for optimistic UI
    const tempMealPlan: MealPlan = {
      ...mealPlan,
    };

    setMealPlan(prev => [...prev, tempMealPlan]);
    try {
      const savedMealPlanResponse = await mealPlanApi.create(mealPlan);
      if (savedMealPlanResponse && savedMealPlanResponse.data && savedMealPlanResponse.success) {
        const raw = savedMealPlanResponse.data as MealPlan | { mealPlan?: MealPlan };
        const savedMealPlan = normalizeMealPlan(
          (('mealPlan' in raw && raw.mealPlan) ? raw.mealPlan : raw) as unknown as Record<string, unknown>
        );

        // replace temp with the one from backend
        setMealPlan(prev =>
          prev.map(m => (m.id === tempMealPlan.id ? savedMealPlan : m))
        );
        return { ...savedMealPlanResponse, data: savedMealPlan };
      } else {
        // rollback if response is invalid
        setMealPlan(prev => prev.filter(m => m.id !== tempMealPlan.id));
      }
      return savedMealPlanResponse as ApiResponse<MealPlan>;
    } catch (err) {
      console.error('Insert meal plan failed:', err);
      // rollback if needed
      setMealPlan(prev => prev.filter(m => m.id !== tempMealPlan.id));
      return { success: false } as ApiResponse<MealPlan>;
    }
  }, [setMealPlan]);
  const updateMealPlan = useCallback((mealPlan: MealPlan) => {
    const previous = mealPlanRef.current.find(m => m.id === mealPlan.id);
    setMealPlan(prev => prev.map(m => m.id === mealPlan.id ? mealPlan : m));
    void runOptimisticWrite(
      () => mealPlanApi.update(mealPlan.id, mealPlan),
      () => { if (previous) setMealPlan(prev => prev.map(m => m.id === previous.id ? previous : m)); },
    );
  }, [mealPlanRef, runOptimisticWrite, setMealPlan]);
  const deleteMealPlan = useCallback((id: string) => {
    const snapshot = mealPlanRef.current;
    setMealPlan(prev => prev.filter(m => m.id !== id));
    void runOptimisticWrite(() => mealPlanApi.delete(id), () => setMealPlan(snapshot), { okCodes: ['not_found'] });
  }, [mealPlanRef, runOptimisticWrite, setMealPlan]);

  const confirmMealPlan = useCallback(async (id: string): Promise<ApiResponse<ConfirmMealPlanResult>> => {
    try {
      const response = await mealPlanApi.confirm(id);
      if (response.success && response.data) {
        const confirmed = normalizeMealPlan(
          (response.data.mealPlan ?? response.data) as unknown as Record<string, unknown>
        );
        setMealPlan(prev => prev.map(m => (m.id === id ? confirmed : m)));
        await fetchAllPantryItems({ force: true });
      }
      return response as ApiResponse<ConfirmMealPlanResult>;
    } catch (err) {
      console.error('Confirm meal plan failed:', err);
      return { success: false } as ApiResponse<ConfirmMealPlanResult>;
    }
  }, [fetchAllPantryItems, setMealPlan]);

  const skipMealPlan = useCallback(async (id: string): Promise<ApiResponse<{ mealPlan: MealPlan; alreadySkipped: boolean }>> => {
    try {
      const response = await mealPlanApi.skip(id);
      if (response.success && response.data) {
        const skipped = normalizeMealPlan(
          ((response.data as { mealPlan?: MealPlan }).mealPlan ?? response.data) as unknown as Record<string, unknown>
        );
        setMealPlan(prev => prev.map(m => (m.id === id ? skipped : m)));
      }
      return response as ApiResponse<{ mealPlan: MealPlan; alreadySkipped: boolean }>;
    } catch (err) {
      console.error('Skip meal plan failed:', err);
      return { success: false } as ApiResponse<{ mealPlan: MealPlan; alreadySkipped: boolean }>;
    }
  }, [setMealPlan]);

  const fetchPendingConfirmations = useCallback(async (): Promise<MealPlan[]> => {
    try {
      const response = await mealPlanApi.pendingConfirm();
      if (response.success && response.data) {
        return unwrapListResponse(response.data as MealPlan[] | { mealPlans?: MealPlan[] }, 'mealPlans')
          .map(plan => normalizeMealPlan(plan as unknown as Record<string, unknown>));
      }
    } catch (err) {
      console.error('Fetch pending confirmations failed:', err);
    }
    return [];
  }, []);

  // Cached lists belong to one session: never serve them to the next user.
  useEffect(() => {
    foldersFetcher.invalidate();
    recipesFetcher.invalidate();
    pantryFetcher.invalidate();
    shoppingFetcher.invalidate();
    mealPlansFetcher.invalidate();
  }, [isAuthenticated, foldersFetcher, recipesFetcher, pantryFetcher, shoppingFetcher, mealPlansFetcher]);

  const value = useMemo<PantryContextType>(() => ({
    recipes,
    recipesLoading,
    pantryItems,
    shoppingList,
    addRecipe,
    fetchAllRecipes,
    updateRecipe,
    deleteRecipe,
    userSettings,
    updateUserSettings,
    folders,
    fetchAllFolders,
    addFolder,
    deleteFolder,
    updateFolder,
    fetchAllPantryItems,
    updatePantryItem,
    updatePantryItems,
    addPantryItem,
    removePantryItem,
    fetchAllIngredients,
    ingredients,
    fetchAllShoppingListItems,
    updateShoppingListItem,
    addShoppingListItem,
    removeShoppingListItem,
    syncShoppingItemsToPantry,
    unsyncShoppingItemsFromPantry,
    mealPlan,
    mealPlansLoading,
    fetchAllMealPlans,
    addMealPlan,
    updateMealPlan,
    deleteMealPlan,
    confirmMealPlan,
    skipMealPlan,
    fetchPendingConfirmations,
    updateIngredients,
  }), [
    recipes,
    recipesLoading,
    pantryItems,
    shoppingList,
    addRecipe,
    fetchAllRecipes,
    updateRecipe,
    deleteRecipe,
    userSettings,
    updateUserSettings,
    folders,
    fetchAllFolders,
    addFolder,
    deleteFolder,
    updateFolder,
    fetchAllPantryItems,
    updatePantryItem,
    updatePantryItems,
    addPantryItem,
    removePantryItem,
    fetchAllIngredients,
    ingredients,
    fetchAllShoppingListItems,
    updateShoppingListItem,
    addShoppingListItem,
    removeShoppingListItem,
    syncShoppingItemsToPantry,
    unsyncShoppingItemsFromPantry,
    mealPlan,
    mealPlansLoading,
    fetchAllMealPlans,
    addMealPlan,
    updateMealPlan,
    deleteMealPlan,
    confirmMealPlan,
    skipMealPlan,
    fetchPendingConfirmations,
    updateIngredients,
  ]);

  return <PantryContext.Provider value={value}>
    {children}
    {mutationError && (
      <div
        role="alert"
        className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-sm text-surface shadow-lg"
      >
        {mutationError}
      </div>
    )}
  </PantryContext.Provider>;
}
export function usePantry() {
  const context = useContext(PantryContext);
  if (context === undefined) {
    throw new Error('usePantry must be used within a PantryProvider');
  }
  return context;
}
