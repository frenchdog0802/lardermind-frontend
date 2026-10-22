import { Clock, ShoppingCart } from 'lucide-react';

interface RecipeCardProps {
  recipe: any;
  onSelect: () => void;
  readiness: 'ready' | 'missing-one';
  missingIngredient?: any;
}

export function RecipeCard({ recipe, onSelect, readiness, missingIngredient }: RecipeCardProps) {
  return (
    <div
      className="flex gap-4 py-4 border-b border-line last:border-b-0 cursor-pointer hover:bg-sage/20 transition-colors -mx-2 px-2 rounded-lg"
      onClick={onSelect}
    >
      <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
        <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="font-display font-semibold text-lg text-ink truncate">{recipe.name}</h3>
          <div className="flex items-center text-muted text-sm mt-1">
            <Clock size={16} className="mr-1" />
            <span>{recipe.cookTime} mins</span>
          </div>
        </div>
        <div className="mt-2">
          {readiness === 'ready' ? (
            <span className="text-xs font-medium text-herb">Ready to cook</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted">Needs 1 item</span>
              <div className="flex items-center text-muted text-xs">
                <ShoppingCart size={14} className="mr-1" />
                <span>{missingIngredient?.name}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
