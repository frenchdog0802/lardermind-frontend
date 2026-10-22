import { useState } from 'react';
import { ArrowLeftIcon, CheckCircleIcon, ShoppingCartIcon } from 'lucide-react';
import { usePantry } from '../contexts/pantryContext';
import { IngredientEntry, Recipe } from '../api/types';
import { QuantityLabel } from './UnitSelect';
import type { MeasurementSystem } from '../utils/units';
interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
}
export function RecipeDetail({
  recipe,
  onBack
}: RecipeDetailProps) {
  const {
    pantryItems,
    userSettings,
  } = usePantry();
  const measurementSystem = (userSettings.measurement_unit === 'imperial' ? 'imperial' : 'metric') as MeasurementSystem;
  const [cooked] = useState(false);
  const checkIngredientAvailability = (ingredient: IngredientEntry) => {
    const pantryItem = pantryItems.find(item => item.name.toLowerCase() === ingredient.name.toLowerCase());
    if (!pantryItem) return 'missing';
    return 'available';
  };
  return <div className="flex flex-col w-full min-h-screen bg-gray-50">
    <div className="flex-1 overflow-y-auto pb-20">
      {/* Header */}
      <div className="container mx-auto px-5 py-6 flex items-center gap-4">
        <button onClick={onBack} className="lg:hidden p-2 rounded-lg text-muted hover:text-ink hover:bg-sage/50 transition-colors" aria-label="Go back">
          <ArrowLeftIcon size={22} />
        </button>
        <h1 className="page-title animate-fade-in">Recipe Details</h1>
      </div>
      {/* Recipe Image */}
      {recipe.image?.url ? (
        <div className="w-full h-64 relative">
          <img src={recipe.image.url} alt={recipe.meal_name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="text-2xl font-bold text-white">{recipe.meal_name}</h2>
            <p className="text-white/90">
              {/* {recipe.cookTime} mins ??{recipe.difficulty} */} 100 min · Medium
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full px-5 pt-2 pb-4">
          <h2 className="text-2xl font-bold text-ink">{recipe.meal_name}</h2>
        </div>
      )}
      {/* Main Content */}
      <main className="flex-1 container mx-auto p-5">
        {cooked ? <div className="bg-sage/50 p-4 rounded-xl mb-6 flex items-center border border-line">
          <CheckCircleIcon className="text-herb mr-3" size={24} />
          <div>
            <h3 className="font-semibold text-herb-deep">Recipe Cooked!</h3>
            <p className="text-herb-deep text-sm">
              Your pantry has been updated and added to your calendar
            </p>
          </div>
        </div> : null}
        {/* Ingredients Section */}
        <section className="mb-8 bg-surface p-6 rounded-xl shadow-sm border border-line">
          <h3 className="text-xl font-bold text-ink mb-4">Ingredients</h3>
          <ul className="space-y-3">
            {recipe.ingredients.map((ingredient: any, index: number) => {
              const availability = checkIngredientAvailability(ingredient);
              return <li key={index} className={`flex justify-between items-center p-3 rounded-lg ${availability === 'available' ? 'bg-sage/50 border border-line' : 'bg-gray-50 border border-line'}`}>
                <span className="font-medium">
                  {Number(ingredient.quantity) > 0 && (
                    <>
                      <QuantityLabel
                        quantity={Number(ingredient.quantity)}
                        unit={ingredient.unit}
                        unitKind={ingredient.unit_kind}
                        baseUnit={ingredient.base_unit}
                        defaultDisplayUnit={ingredient.default_display_unit}
                        measurementSystem={measurementSystem}
                      />{' '}
                    </>
                  )}
                  {ingredient.name}
                </span>
                {availability === 'missing' && <button className="text-muted flex items-center text-sm font-medium bg-surface px-3 py-1 rounded-lg border border-line">
                  <ShoppingCartIcon size={16} className="mr-1" />
                  Add to list
                </button>}
              </li>;
            })}
          </ul>
        </section>
        {/* Instructions Section */}
        <section className="mb-8 bg-surface p-6 rounded-xl shadow-sm border border-line">
          <h3 className="text-xl font-bold text-ink mb-4">Instructions</h3>
          {(recipe.instructions?.length ?? 0) > 0 ? (
            <ol className="space-y-5">
              {recipe.instructions.map((step: any, index: number) => <li key={index} className="flex">
                <div className="bg-sage rounded-full w-8 h-8 flex items-center justify-center text-herb-deep font-semibold mr-4 flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-ink">{step}</p>
              </li>)}
            </ol>
          ) : (
            <p className="text-muted">No instructions yet.</p>
          )}
        </section>
      </main>
    </div></div>;
}