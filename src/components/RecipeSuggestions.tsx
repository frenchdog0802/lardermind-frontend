import { ArrowLeftIcon } from 'lucide-react';
import { usePantry } from '../contexts/pantryContext';
import type { RecipeSuggestion } from '../api/types';
import { recipeSuggestions } from '../utils/recipeData';
import { RecipeCard } from './RecipeCard';
interface RecipeSuggestionsProps {
  onSelectRecipe: (recipe: RecipeSuggestion) => void;
  onBack: () => void;
}
export function RecipeSuggestions({
  onSelectRecipe,
  onBack
}: RecipeSuggestionsProps) {
  const {
    pantryItems
  } = usePantry();
  // Filter recipes based on available ingredients
  const cookNowRecipes = recipeSuggestions.filter(recipe => recipe.ingredients.every(ingredient => pantryItems.some(item => item.name.toLowerCase() === ingredient.name.toLowerCase() && item.quantity >= ingredient.quantity)));
  const needsOneItemRecipes = recipeSuggestions.filter(recipe => {
    const missingIngredients = recipe.ingredients.filter(ingredient => !pantryItems.some(item => item.name.toLowerCase() === ingredient.name.toLowerCase() && item.quantity >= ingredient.quantity));
    return missingIngredients.length === 1;
  });
  return <div className="flex flex-col w-full min-h-screen bg-gray-50">
    <div className="flex-1 overflow-y-auto pb-20">
      {/* Header */}
      <div className="container mx-auto px-5 py-6 flex items-center gap-4">
        <button onClick={onBack} className="lg:hidden p-2 rounded-lg text-muted hover:text-ink hover:bg-sage/50 transition-colors" aria-label="Go back">
          <ArrowLeftIcon size={22} />
        </button>
        <h1 className="page-title animate-fade-in">Recipe Suggestions</h1>
      </div>
      {/* Main Content */}
      <main className="flex-1 container mx-auto p-5">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-ink mb-2">Cook Now</h2>
          <p className="text-muted mb-5">
            Recipes you can make with what you have
          </p>
          {cookNowRecipes.length > 0 ? <div className="space-y-5">
            {cookNowRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} onSelect={() => onSelectRecipe(recipe)} readiness="ready" />)}
          </div> : <div className="bg-surface p-6 rounded-xl shadow-sm border border-line text-center">
            <p className="text-muted">
              No recipes available with current ingredients.
            </p>
          </div>}
        </div>
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-ink mb-2">
            Almost There
          </h2>
          <p className="text-muted mb-5">
            Just missing one ingredient to make these
          </p>
          {needsOneItemRecipes.length > 0 ? <div className="space-y-5">
            {needsOneItemRecipes.map(recipe => {
              const missingIngredient = recipe.ingredients.find(ingredient => !pantryItems.some(item => item.name.toLowerCase() === ingredient.name.toLowerCase() && item.quantity >= ingredient.quantity));
              return <RecipeCard key={recipe.id} recipe={recipe} onSelect={() => onSelectRecipe(recipe)} readiness="missing-one" missingIngredient={missingIngredient} />;
            })}
          </div> : <div className="bg-surface p-6 rounded-xl shadow-sm border border-line text-center">
            <p className="text-muted">
              No recipes available needing just one item.
            </p>
          </div>}
        </div>
      </main>
    </div></div>;
}