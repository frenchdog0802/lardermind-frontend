/** Readable titles for pending-approval tool calls (raw tool names never reach the UI). */

const KNOWN_TOOLS = new Set([
  'addPantryItems',
  'updatePantryItems',
  'removePantryItems',
  'addItemsToShoppingList',
  'addMealPlanShortagesToShoppingList',
  'createRecipe',
  'updateRecipe',
  'addRecipeToMenu',
  'planMeals',
  'updatePreferences',
]);

/** i18n key for a tool's card title; unknown tools fall back to a generic title. */
export function approvalToolTitleKey(toolName: string): string {
  return KNOWN_TOOLS.has(toolName)
    ? `ai.approvalTool.${toolName}`
    : 'ai.approvalTool.generic';
}

/** "2026-11-18" -> local-date key helper used for "already scheduled today" checks. */
export function localYmd(date: Date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** True when the recipe already has an active meal plan on `ymd`. */
export function isRecipeScheduledOn(
  mealPlans: Array<{ recipe_id?: string | number | null; serving_date: string; status?: string }>,
  recipeId: string | number | null | undefined,
  ymd: string,
): boolean {
  if (recipeId == null || recipeId === '') return false;
  return mealPlans.some(
    (m) =>
      String(m.recipe_id ?? '') === String(recipeId) &&
      m.serving_date === ymd &&
      m.status !== 'SKIPPED',
  );
}
