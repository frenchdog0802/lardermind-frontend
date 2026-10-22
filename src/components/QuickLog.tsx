import { useEffect, useState, useMemo, type ChangeEvent } from 'react';
import { ArrowLeftIcon, CheckIcon, XIcon, PlusIcon, TrashIcon, SearchIcon, CalendarIcon, ImageIcon, CookingPot } from 'lucide-react';
import { usePantry } from '../contexts/pantryContext';
import type { Recipe } from '../api/types';

type QuickIngredient = {
  name: string;
  quantity: number;
  unit: string;
};
interface QuickLogProps {
  onBack: () => void;
  onNavigateToRecipes: () => void;
}

export function QuickLog({
  onBack,
  onNavigateToRecipes
}: QuickLogProps) {
  const {
    recipes: storedRecipes,
    pantryItems,
    updatePantryItems,
    addRecipe,
    fetchAllRecipes
  } = usePantry();
  const quickMealSuggestions = useMemo(
    () => storedRecipes.map((item) => item.meal_name),
    [storedRecipes]
  );
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState('dinner');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<QuickIngredient[]>([]);
  const [showIngredientSelector, setShowIngredientSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentIngredient, setCurrentIngredient] = useState<QuickIngredient>({
    name: '',
    quantity: 1,
    unit: ''
  });
  // New state for date selection and image
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mealImage, setMealImage] = useState<string | null>(null);
  const mealTypes = [{
    id: 'breakfast',
    label: 'Breakfast'
  }, {
    id: 'lunch',
    label: 'Lunch'
  }, {
    id: 'dinner',
    label: 'Dinner'
  }, {
    id: 'snack',
    label: 'Snack'
  }];




  useEffect(() => {
    fetchAllRecipes(); // Fetch suggestions on component mount
  }, []);
  // Filter pantry items based on search
  const filteredPantryItems = pantryItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const handleLogMeal = () => {
    if (!mealName.trim()) return;
    // Create a recipe object with ingredients
    const quickLogRecipe: Recipe = {
      id: `quick-log-${Date.now()}`,
      folder_id: '',
      meal_name: mealName,
      instructions: [],
      ingredients: selectedIngredients.map((ingredient) => ({
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
      })),
      image: mealImage ? { public_id: '', url: mealImage } : null,
    };
    // Update pantry by decreasing used ingredients
    if (selectedIngredients.length > 0) {
      const updatedPantry = pantryItems.map(pantryItem => {
        const usedIngredient = selectedIngredients.find(ing => ing.name.toLowerCase() === pantryItem.name.toLowerCase());
        if (usedIngredient) {
          return {
            ...pantryItem,
            quantity: Math.max(0, pantryItem.quantity - usedIngredient.quantity)
          };
        }
        return pantryItem;
      });
      // Update pantry
      updatePantryItems(updatedPantry);
    }
    addRecipe(quickLogRecipe);
    // Show success message
    setSuccessMessage(`${mealName} added to your cooking log and inventory updated!`);
    // Reset form
    setMealName('');
    setSelectedIngredients([]);
    setMealImage(null);
    setSelectedDate(new Date().toISOString().split('T')[0]);
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };
  const handleQuickAdd = (suggestion: string) => {
    setMealName(suggestion);
  };
  const handleAddIngredient = () => {
    if (!currentIngredient.name) return;
    // Add ingredient to selected list
    setSelectedIngredients([...selectedIngredients, currentIngredient]);
    // Reset current ingredient
    setCurrentIngredient({
      name: '',
      quantity: 1,
      unit: ''
    });
    // Close selector
    setShowIngredientSelector(false);
  };
  const handleRemoveIngredient = (index: number) => {
    const updatedIngredients = [...selectedIngredients];
    updatedIngredients.splice(index, 1);
    setSelectedIngredients(updatedIngredients);
  };
  const handleSelectPantryItem = (item: { name: string; unit: string }) => {
    setCurrentIngredient({
      name: item.name,
      quantity: 1,
      unit: item.unit
    });
  };
  // Handle image upload
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        setMealImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  // Remove uploaded image
  const handleRemoveImage = () => {
    setMealImage(null);
  };
  return <div className="flex flex-col w-full min-h-screen bg-linen">
    <div className="flex-1 overflow-y-auto pb-20">
      {/* Header */}
      <div className="container mx-auto px-5 py-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="lg:hidden p-2 rounded-lg text-muted hover:text-ink hover:bg-sage/50 transition-colors" aria-label="Go back">
            <ArrowLeftIcon size={22} />
          </button>
          <h1 className="page-title animate-fade-in">Quick Meal Log</h1>
        </div>
        <button onClick={onNavigateToRecipes} className="p-2 rounded-lg text-muted hover:text-ink hover:bg-sage/50 transition-colors" aria-label="View Recipes">
          <CookingPot size={22} />
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-5">
        {/* Success Message */}
        {successMessage && <div className="bg-sage/50 border border-line rounded-xl p-4 mb-6 flex items-center">
          <CheckIcon className="text-herb mr-2" size={20} />
          <p className="text-herb-deep">{successMessage}</p>
        </div>}

        <div className="bg-surface rounded-xl shadow-sm border border-line p-6 mb-6">
          <h2 className="text-xl font-bold text-ink mb-4">
            What did you cook today?
          </h2>

          {/* Meal Input Form */}
          <div className="space-y-4">
            <div>
              <label htmlFor="meal-name" className="block text-ink mb-2">
                Meal Name
              </label>
              <input type="text" id="meal-name" value={mealName} onChange={e => setMealName(e.target.value)} placeholder="Enter what you cooked" className="w-full p-3 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-herb/30 focus:border-transparent" />
            </div>

            {/* Date Selector */}
            <div>
              <label htmlFor="meal-date" className="block text-ink mb-2">
                Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CalendarIcon size={18} className="text-muted" />
                </div>
                <input type="date" id="meal-date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-herb/30 focus:border-transparent" />
              </div>
            </div>

            <div>
              <label htmlFor="meal-type" className="block text-ink mb-2">
                Meal Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {mealTypes.map(type => <button key={type.id} type="button" onClick={() => setMealType(type.id)} className={`py-3 px-4 rounded-xl border ${mealType === type.id ? 'bg-sage/50 border-line text-herb-deep' : 'bg-surface border-line text-ink hover:bg-linen'} transition-colors`}>
                  {type.label}
                </button>)}
              </div>
            </div>

            {/* Image Upload Section */}
            <div>
              <label className="block text-ink mb-2">
                Meal Photo (optional)
              </label>
              {!mealImage ? <div className="border-2 border-dashed border-line rounded-xl p-6 text-center">
                <ImageIcon size={32} className="mx-auto text-muted mb-2" />
                <p className="text-muted mb-2">Add a photo of your meal</p>
                <label className="cursor-pointer bg-linen hover:bg-sage/50 text-ink py-2 px-4 rounded-lg border border-line inline-block transition-colors">
                  Upload Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div> : <div className="relative rounded-xl overflow-hidden">
                <img src={mealImage} alt="Meal" className="w-full h-48 object-cover" />
                <button onClick={handleRemoveImage} className="absolute top-2 right-2 bg-surface/80 p-1 rounded-full hover:bg-surface text-herb" aria-label="Remove image">
                  <XIcon size={20} />
                </button>
              </div>}
            </div>

            {/* Ingredients Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-ink">Ingredients Used</label>
                <button onClick={() => setShowIngredientSelector(true)} className="text-sm flex items-center text-herb hover:text-herb-deep">
                  <PlusIcon size={16} className="mr-1" />
                  Add Ingredient
                </button>
              </div>

              {selectedIngredients.length === 0 ? <div className="bg-linen border border-line rounded-xl p-4 text-center text-muted">
                No ingredients added yet
              </div> : <ul className="bg-linen border border-line rounded-xl divide-y divide-line">
                {selectedIngredients.map((ingredient, index) => <li key={index} className="flex justify-between items-center p-3">
                  <div>
                    <p className="font-medium text-ink">
                      {ingredient.name}
                    </p>
                    <p className="text-sm text-muted">
                      {ingredient.quantity} {ingredient.unit}
                    </p>
                  </div>
                  <button onClick={() => handleRemoveIngredient(index)} className="p-1 rounded-full hover:bg-sage/50 text-herb">
                    <TrashIcon size={16} />
                  </button>
                </li>)}
              </ul>}
            </div>

            <button onClick={handleLogMeal} disabled={!mealName.trim()} className={`w-full py-3 px-4 rounded-xl font-medium ${mealName.trim() ? 'bg-herb hover:bg-herb-deep text-white' : 'bg-sage/40 text-muted cursor-not-allowed'} transition-colors`}>
              Log This Meal
            </button>
          </div>
        </div>

        {/* Quick Add Suggestions */}
        <div className="bg-surface rounded-xl shadow-sm border border-line p-6">
          <h3 className="font-medium text-ink mb-4">Quick Add</h3>
          <div className="flex flex-wrap gap-2">
            {quickMealSuggestions.map(suggestion => <button key={suggestion} onClick={() => handleQuickAdd(suggestion)} className="bg-linen hover:bg-sage/50 text-ink py-2 px-4 rounded-lg border border-line text-sm transition-colors">
              {suggestion}
            </button>)}
          </div>
        </div>
      </main>

      {/* Ingredient Selector Modal */}
      {showIngredientSelector && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-surface rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-hidden">
          <div className="p-4 border-b border-line flex justify-between items-center">
            <h3 className="font-medium text-ink">Add Ingredient</h3>
            <button onClick={() => setShowIngredientSelector(false)} className="p-1 rounded-full hover:bg-sage/50">
              <XIcon size={20} className="text-muted" />
            </button>
          </div>

          <div className="p-4">
            {/* Search Bar */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon size={16} className="text-muted" />
              </div>
              <input type="text" placeholder="Search pantry items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-lg border border-line focus:outline-none focus:ring-2 focus:ring-herb/30 focus:border-transparent" />
            </div>

            {/* Pantry Items List */}
            <div className="max-h-60 overflow-y-auto mb-4">
              {filteredPantryItems.length > 0 ? <ul className="divide-y divide-line">
                {filteredPantryItems.map(item => <li key={item.name} onClick={() => handleSelectPantryItem(item)} className={`p-3 cursor-pointer hover:bg-linen rounded ${currentIngredient.name === item.name ? 'bg-sage/50' : ''}`}>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted">
                    Available: {item.quantity} {item.unit}
                  </p>
                </li>)}
              </ul> : <p className="text-center py-4 text-muted">
                No items found
              </p>}
            </div>

            {/* Custom Ingredient */}
            {!currentIngredient.name && <div className="mb-4">
              <div className="text-sm text-muted mb-2">
                Or add custom ingredient:
              </div>
              <input type="text" placeholder="Ingredient name" value={currentIngredient.name} onChange={e => setCurrentIngredient({
                ...currentIngredient,
                name: e.target.value
              })} className="w-full p-2 mb-2 border border-line rounded-lg" />
            </div>}

            {/* Quantity Input */}
            {currentIngredient.name && <div className="mb-4">
              <label className="block text-sm text-ink mb-1">
                How much {currentIngredient.name} did you use?
              </label>
              <div className="flex gap-2">
                <input type="number" min="1" value={currentIngredient.quantity} onChange={e => setCurrentIngredient({
                  ...currentIngredient,
                  quantity: parseInt(e.target.value) || 1
                })} className="w-1/3 p-2 border border-line rounded-lg" />
                <input type="text" placeholder="Unit (g, ml, etc.)" value={currentIngredient.unit} onChange={e => setCurrentIngredient({
                  ...currentIngredient,
                  unit: e.target.value
                })} className="w-2/3 p-2 border border-line rounded-lg" />
              </div>
            </div>}

            <div className="flex gap-2">
              <button onClick={() => setShowIngredientSelector(false)} className="w-1/2 bg-sage/40 text-ink py-2 rounded-lg">
                Cancel
              </button>
              <button onClick={handleAddIngredient} disabled={!currentIngredient.name} className={`w-1/2 ${currentIngredient.name ? 'bg-herb text-white' : 'bg-sage/40 text-muted cursor-not-allowed'} py-2 rounded-lg`}>
                Add Ingredient
              </button>
            </div>
          </div>
        </div>
      </div>}
    </div></div>;
}