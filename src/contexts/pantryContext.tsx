import React, { useState, createContext, useContext, useEffect, useRef } from 'react';
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
import { resolveStoredLanguage } from '../i18n';

function unwrapListResponse<T>(data: T[] | Record<string, T[] | undefined>, key: string): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  const list = data[key];
  return Array.isArray(list) ? list : [];
}

function normalizeInstructions(raw: unknown, stepsFallback?: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String).map(s => s.trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  }
  if (Array.isArray(stepsFallback)) {
    return stepsFallback.map(String).map(s => s.trim()).filter(Boolean);
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

interface PantryContextType {
  recipes: Recipe[];
  recipesLoading: boolean;
  fetchAllRecipes: () => Promise<Recipe[]>;
  addRecipe: (Recipe: Recipe) => void;
  updateRecipe: (Recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;
  userSettings: UserSettings;
  updateUserSettings: (settings: UserSettings) => void;
  folders: Folder[];
  fetchAllFolders: () => void;
  addFolder: (folder: Folder) => Promise<void>;
  deleteFolder: (id: string) => void;
  updateFolder: (folder: Folder) => void;
  // createInitFolders: (folders: Folder[]) => void;

  // pantry items
  pantryItems: PantryItem[];
  fetchAllPantryItems: () => void;
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
  fetchAllShoppingListItems: () => Promise<ShoppingListItem[]>;
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
  fetchAllMealPlans: () => Promise<MealPlan[]>;
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
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([]);
  // ingredient state
  const [ingredients, setIngredients] = useState<IngredientEntry[]>([]);
  // folder state
  const [folders, setFolders] = useState<Folder[]>([]);
  // main state
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const shoppingListRef = useRef<ShoppingListItem[]>([]);
  const shoppingQueueRef = useRef(new Map<string, Promise<unknown>>());

  const commitShoppingList = (updater: (prev: ShoppingListItem[]) => ShoppingListItem[]) => {
    const next = updater(shoppingListRef.current);
    shoppingListRef.current = next;
    setShoppingList(next);
  };

  const enqueueShoppingWrite = <T,>(id: string, task: () => Promise<T>): Promise<T> => {
    const previous = shoppingQueueRef.current.get(id) ?? Promise.resolve();
    const run = previous.then(task, task);
    shoppingQueueRef.current.set(id, run);
    void run.finally(() => {
      if (shoppingQueueRef.current.get(id) === run) {
        shoppingQueueRef.current.delete(id);
      }
    });
    return run;
  };
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [mealPlansLoading, setMealPlansLoading] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    name: '',
    language: resolveStoredLanguage(),
    measurement_unit: 'metric'
  });

  useEffect(() => {
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
  }, []);

  const fetchAllFolders = async () => {
    try {
      const fetchedFoldersResponse = await folderApi.list();
      if (fetchedFoldersResponse?.success && fetchedFoldersResponse.data) {
        setFolders(unwrapListResponse(fetchedFoldersResponse.data, 'folders'));
      }
    } catch (err) {
      console.error('Fetch folders failed:', err);
    }
  };


  const addFolder = async (folder: Folder) => {
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
          await fetchAllFolders();
        }
      }
    } catch (err) {
      console.error('Insert folder failed:', err);
      setFolders(prev => prev.filter(f => f.id !== tempFolder.id));
    }
  };
  const deleteFolder = (id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    folderApi.delete(id);
  };

  const updateFolder = (folder: Folder) => {
    setFolders(prev => prev.map(f => f.id === folder.id ? folder : f));
    folderApi.update(folder.id, folder);
  };


  const fetchAllRecipes = async () => {
    setRecipesLoading(true);
    try {
      const fetchedRecipesResponse = await recipeApi.list();
      if (fetchedRecipesResponse?.success && fetchedRecipesResponse.data) {
        const data = fetchedRecipesResponse.data as Recipe[] | { recipes?: Recipe[] };
        const recipesList = unwrapListResponse(data, 'recipes').map(recipe =>
          normalizeRecipe(recipe as unknown as Record<string, unknown>)
        );
        setRecipes(recipesList);
        return recipesList;
      }
    } catch (err) {
      console.error('Fetch recipes failed:', err);
    } finally {
      setRecipesLoading(false);
    }
    return [];
  }
  const addRecipe = async (recipe: Recipe) => {
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
  };
  const updateRecipe = (recipe: Recipe) => {
    const normalized = {
      ...recipe,
      instructions: normalizeInstructions(recipe.instructions),
      image: normalizeRecipeImage(recipe.image) as Recipe['image'],
    };
    // optimistic update
    setRecipes(prev => prev.map(r => r.id === recipe.id ? normalized : r));

    (async () => {
      try {
        await recipeApi.update(recipe.id, serializeRecipeForApi(normalized) as Partial<Recipe>);
      } catch (err) {
        console.error('Update recipe failed:', err);
        // rollback by re-fetching recipes to restore consistent state
        fetchAllRecipes();
      }
    })();
  };
  const deleteRecipe = (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    recipeApi.delete(id);
  };
  const updateUserSettings = (settings: UserSettings) => {
    setUserSettings(settings);
  };

  const fetchAllPantryItems = async () => {
    try {
      const fetchedPantryItemsResponse = await PantryItemApi.list();
      if (fetchedPantryItemsResponse?.success && fetchedPantryItemsResponse.data) {
        setPantryItems(parsePantryItems(fetchedPantryItemsResponse.data));
      }
    } catch (err) {
      console.error('Fetch pantry items failed:', err);
    }
  };
  const addPantryItem = async (item: Omit<PantryItem, 'id'>) => {
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
    }
  };
  const updatePantryItem = (item: PantryItem) => {
    setPantryItems(prev => prev.map(i => i.id === item.id ? item : i));
    PantryItemApi.update(item.id, item);
  };
  const updatePantryItems = (items: PantryItem[]) => {
    setPantryItems(items);
    PantryItemApi.updateMany(items);
  };

  const removePantryItem = (id: string) => {
    setPantryItems(prev => prev.filter(i => i.id !== id));
    PantryItemApi.delete(id);
  };

  // fetch ingredients with optional query
  const fetchAllIngredients = async (query: string | null) => {
    try {
      const fetchedIngredientsResponse = await ingredientApi.list(query || undefined);
      if (fetchedIngredientsResponse?.success && fetchedIngredientsResponse.data) {
        setIngredients(unwrapListResponse(fetchedIngredientsResponse.data, 'ingredients'));
      }
    } catch (err) {
      console.error('Fetch ingredients failed:', err);
    }
  };
  const updateIngredients = (item: IngredientEntry) => {
    setIngredients(prev => prev.map(i => i.id === item.id ? item : i));
    ingredientApi.update(item.id, item);
  };

  // shopping list item functions
  const fetchAllShoppingListItems = async () => {
    try {
      const fetchedItemsResponse = await shoppingListApi.list();
      if (fetchedItemsResponse && fetchedItemsResponse.data && fetchedItemsResponse.success) {
        const fetchedItems = parseShoppingListItems(fetchedItemsResponse.data);
        commitShoppingList(() => fetchedItems);
        return fetchedItems;
      }
    } catch (err) {
      console.error('Fetch shopping list items failed:', err);
    }
    return [];
  };
  const updateShoppingListItem = (item: ShoppingListItem) => {
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
  };

  const addShoppingListItem = async (item: Omit<ShoppingListItem, 'id'>) => {
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
    }

  };
  const removeShoppingListItem = (id: string) => {
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
  };

  const syncShoppingItemsToPantry = async (
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
      await fetchAllPantryItems();
      return { ...response, data: result };
    }
    return response as ApiResponse<{
      synced: ShoppingListItem[];
      skipped: Array<{ id: string; reason: string }>;
    }>;
  };

  const unsyncShoppingItemsFromPantry = async (itemIds: string[]) => {
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
      await fetchAllPantryItems();
      return { ...response, data: result };
    }
    return response as ApiResponse<{
      unsynced: ShoppingListItem[];
      skipped: Array<{ id: string; reason: string }>;
    }>;
  };

  // meal plan functions
  const fetchAllMealPlans = async () => {
    setMealPlansLoading(true);
    try {
      const fetchedMealPlansResponse = await mealPlanApi.list();
      if (fetchedMealPlansResponse?.success && fetchedMealPlansResponse.data) {
        const data = fetchedMealPlansResponse.data as MealPlan[] | { mealPlans?: MealPlan[] };
        const mealPlansList = unwrapListResponse(data, 'mealPlans').map(plan =>
          normalizeMealPlan(plan as unknown as Record<string, unknown>)
        );
        setMealPlan(mealPlansList);
        return mealPlansList;
      }
    } catch (err) {
      console.error('Fetch meal plans failed:', err);
    } finally {
      setMealPlansLoading(false);
    }
    return [];
  };
  const addMealPlan = async (mealPlan: MealPlan): Promise<ApiResponse<MealPlan>> => {
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
  };
  const updateMealPlan = (mealPlan: MealPlan) => {
    setMealPlan(prev => prev.map(m => m.id === mealPlan.id ? mealPlan : m));
    mealPlanApi.update(mealPlan.id, mealPlan);
  };
  const deleteMealPlan = (id: string) => {
    setMealPlan(prev => prev.filter(m => m.id !== id));
    mealPlanApi.delete(id);
  };

  const confirmMealPlan = async (id: string): Promise<ApiResponse<ConfirmMealPlanResult>> => {
    try {
      const response = await mealPlanApi.confirm(id);
      if (response.success && response.data) {
        const confirmed = normalizeMealPlan(
          (response.data.mealPlan ?? response.data) as unknown as Record<string, unknown>
        );
        setMealPlan(prev => prev.map(m => (m.id === id ? confirmed : m)));
        await fetchAllPantryItems();
      }
      return response as ApiResponse<ConfirmMealPlanResult>;
    } catch (err) {
      console.error('Confirm meal plan failed:', err);
      return { success: false } as ApiResponse<ConfirmMealPlanResult>;
    }
  };

  const skipMealPlan = async (id: string): Promise<ApiResponse<{ mealPlan: MealPlan; alreadySkipped: boolean }>> => {
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
  };

  const fetchPendingConfirmations = async (): Promise<MealPlan[]> => {
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
  };

  return <PantryContext.Provider value={{
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
    updateIngredients
  }}>
    {children}
  </PantryContext.Provider>;
}
export function usePantry() {
  const context = useContext(PantryContext);
  if (context === undefined) {
    throw new Error('usePantry must be used within a PantryProvider');
  }
  return context;
}
