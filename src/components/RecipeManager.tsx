import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, PlusIcon, TrashIcon, SearchIcon, EditIcon, XIcon, ImageIcon, FolderIcon, ChevronRightIcon, HomeIcon, MoreVerticalIcon, FolderPlusIcon, PencilIcon, AlertCircleIcon } from 'lucide-react';
import { usePantry } from '../contexts/pantryContext';
import { IngredientEntry, Folder, Recipe } from '../api/types';
import { ImageUploadApi } from '../api/ImageUploader';
import { compressImage } from '../utils/imageHelper';
import { Loading } from './Loading';
import { UnitSelect, QuantityLabel, preferredUnitForIngredient } from './UnitSelect';
import { fromBase, resolveIngredientUnits, type MeasurementSystem } from '../utils/units';
import { AppHeader } from './AppHeader';


interface RecipeManagerProps {
  onBack: () => void;
  onOpenMenu?: () => void;
  selectedRecipeId?: string | null;
  onSelectedRecipeHandled?: () => void;
}

export function RecipeManager({
  onBack,
  onOpenMenu,
  selectedRecipeId,
  onSelectedRecipeHandled,
}: RecipeManagerProps) {
  const { t } = useTranslation();
  const {
    recipes: storedRecipes,
    recipesLoading,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    fetchAllRecipes,
    fetchAllFolders,
    addFolder,
    deleteFolder,
    updateFolder,
    folders: savedFolders,
    ingredients,
    fetchAllIngredients,
    userSettings,
  } = usePantry();
  const measurementSystem = (userSettings.measurement_unit === 'imperial' ? 'imperial' : 'metric') as MeasurementSystem;  const [searchQuery, setSearchQuery] = useState('');
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  // Folders state
  const [folders, setFolders] = useState<Folder[]>(savedFolders);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [showFolderActions, setShowFolderActions] = useState<string | null>(null);
  const [showDeleteFolderConfirmation, setShowDeleteFolderConfirmation] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>(storedRecipes);
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [showIngredientDropdown, setShowIngredientDropdown] = useState(false);
  const ingredientDropdownRef = useRef<HTMLDivElement>(null);
  const [newRecipeError, setNewRecipeError] = useState<string>('');
  const [newRecipe, setNewRecipe] = useState<Recipe>({
    id: '',
    meal_name: '',
    ingredients: [{
      name: '',
      quantity: 1,
      unit: '',
    }],
    image: null as any,
    folder_id: '' as string,
    instructions: [] as string[],
  });
  useEffect(() => {
    fetchAllRecipes();
    fetchAllFolders();
    fetchAllIngredients(null); // Fetch all ingredients initially to enable local filtering
  }, []);

  useEffect(() => {
    setRecipes(storedRecipes);
  }, [storedRecipes]);

  useEffect(() => {
    setFolders(savedFolders);
  }, [savedFolders]);

  useEffect(() => {
    if (!selectedRecipeId || recipes.length === 0) {
      return;
    }
    const match = recipes.find(recipe => recipe.id === selectedRecipeId);
    if (match) {
      setSelectedRecipe(match);
      onSelectedRecipeHandled?.();
    }
  }, [selectedRecipeId, recipes, onSelectedRecipeHandled]);

  // Default folders are created/deduped by the backend on GET /api/folder.
  const uncategorizedFolderId =
    folders.find(folder => folder.name.toLowerCase() === 'uncategorized')?.id ?? '';

  const recipeFolderId = (recipe: Recipe) =>
    recipe.folder_id || uncategorizedFolderId;

  const hasRecipeImage = (recipe: Recipe | null | undefined) =>
    Boolean(recipe?.image?.url);

  const getInstructionsText = (recipe: Recipe) =>
    (recipe.instructions || []).join('\n');

  const setInstructionsFromText = (text: string, target: 'selected' | 'new') => {
    const instructions = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (target === 'selected' && selectedRecipe) {
      setSelectedRecipe({ ...selectedRecipe, instructions });
    } else {
      setNewRecipe(prev => ({ ...prev, instructions }));
    }
  };

  const filteredRecipes = recipes.filter(recipe => {
    if (currentFolder && recipeFolderId(recipe) !== currentFolder.id) {
      return false;
    }
    const matchesSearch = recipe.ingredients && recipe.ingredients.some(item => item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) || recipe.meal_name && recipe.meal_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Handle creating a new folder
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: newFolderName.trim(),
      icon: 'FolderIcon',
    };
    setFolders([...(folders ?? []), newFolder]);
    setNewFolderName('');
    setShowAddFolder(false);
    addFolder(newFolder);
  };
  // Handle updating a folder
  const handleUpdateFolder = () => {
    if (!editingFolder || !newFolderName.trim()) return;
    const updatedFolders = (folders ?? []).map(folder => folder.id === editingFolder.id ? {
      ...folder,
      name: newFolderName.trim()
    } : folder);
    setFolders(updatedFolders);
    setEditingFolder(null);
    setNewFolderName('');
    updateFolder({ ...editingFolder, name: newFolderName.trim() });
  };
  // Handle deleting a folder
  const handleDeleteFolder = () => {
    if (!folderToDelete) return;
    // Move all recipes in this folder to Uncategorized
    recipes.filter(recipe => recipeFolderId(recipe) === folderToDelete.id).forEach(recipe => {
      updateRecipe({
        ...recipe,
        folder_id: uncategorizedFolderId
      });
    });
    setRecipes(prev => prev.map(recipe => recipeFolderId(recipe) === folderToDelete.id ? {
      ...recipe,
      folder_id: uncategorizedFolderId
    } : recipe));
    // Remove the folder
    setFolders((folders ?? []).filter(folder => folder.id !== folderToDelete.id));
    setFolderToDelete(null);
    setShowDeleteFolderConfirmation(false);
    // If current folder is deleted, go back to folder list
    if (currentFolder && currentFolder.id === folderToDelete.id) {
      setCurrentFolder(null);
    }
    deleteFolder(folderToDelete.id);
  };

  const toEditRecipe = (recipe: Recipe): Recipe => ({
    ...recipe,
    ingredients: recipe.ingredients.map(item => {
      const preferred = preferredUnitForIngredient(item, measurementSystem);
      const resolved = resolveIngredientUnits(item);
      const qty = Number(item.quantity) || 0;
      const displayQty = resolved.kind === 'count'
        ? qty
        : fromBase(qty, preferred.unit, resolved.kind);
      return {
        ...item,
        quantity: Math.round(displayQty * 1000) / 1000,
        unit: preferred.unit,
        unit_kind: resolved.kind,
      };
    }),
  });

  const handleSelectIngredient = (pantryItem: IngredientEntry, index: number) => {
    const preferred = preferredUnitForIngredient(pantryItem, measurementSystem);
    if (isEditing && selectedRecipe) {
      const updatedItems = [...selectedRecipe.ingredients];
      updatedItems[index] = {
        ...updatedItems[index],
        name: pantryItem.name,
        unit: preferred.unit,
        unit_kind: preferred.kind,
        base_unit: pantryItem.base_unit,
        default_display_unit: pantryItem.default_display_unit,
        ingredient_id: pantryItem.id,
      };
      setSelectedRecipe({
        ...selectedRecipe,
        ingredients: updatedItems
      });
    } else {
      const updatedItems = [...newRecipe.ingredients];
      updatedItems[index] = {
        ...updatedItems[index],
        name: pantryItem.name,
        unit: preferred.unit,
        unit_kind: preferred.kind,
        base_unit: pantryItem.base_unit,
        default_display_unit: pantryItem.default_display_unit,
        ingredient_id: pantryItem.id,
      };
      setNewRecipe({
        ...newRecipe,
        ingredients: updatedItems
      });
    }
    setShowIngredientDropdown(false);
    setActiveItemIndex(null);
    setItemSearchQuery('');
  };


  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);

      const res = await ImageUploadApi.upload(compressed);

      if (!res.success || !res.data) {
        console.error("Upload failed", res.message);
        return;
      }

      const image_url = res.data.image_url; // Cloudinary URL

      if (isEditing && selectedRecipe) {
        setSelectedRecipe({
          ...selectedRecipe,
          image: {
            url: image_url,
            public_id: res.data.public_id,
          }
        });
      } else {
        setNewRecipe({
          ...newRecipe,
          image: {
            url: image_url,
            public_id: res.data.public_id,
          }
        });
      }
    } catch (err) {
      console.error("Image upload error:", err);
    }
  };

  // handle image removal
  const handleImageRemove = async (publicId: string) => {
    try {
      const res = await ImageUploadApi.delete(publicId);
      console.log("Image deletion response:", res);
      if (res.success) {
        if (isEditing && selectedRecipe) {
          setSelectedRecipe({
            ...selectedRecipe,
            image: null as any,
          });
        } else {
          setNewRecipe({
            ...newRecipe,
            image: null as any,
          });
        }
      }
    } catch (err) {
      console.error("Image deletion error:", err);
    }
  };

  // Update Recipe item
  const handleUpdateRecipeItem = (index: number, field: string, value: any) => {
    if (isEditing && selectedRecipe) {
      const updatedItems = [...selectedRecipe.ingredients];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: field === 'price' || field === 'quantity' ? parseFloat(value) || 0 : value
      };
      setSelectedRecipe({
        ...selectedRecipe,
        ingredients: updatedItems,
      });
    } else {
      const updatedItems = [...newRecipe.ingredients];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: field === 'quantity' ? parseFloat(value) || 0 : value
      };
      setNewRecipe({
        ...newRecipe,
        ingredients: updatedItems,
      });
    }
  };

  // Add a new item to the Recipe
  const handleAddRecipeItem = () => {
    if (isEditing && selectedRecipe) {
      setSelectedRecipe({
        ...selectedRecipe,
        ingredients: [...selectedRecipe.ingredients, {
          name: '',
          quantity: 1,
          unit: ''
        }]
      });
    } else {
      setNewRecipe({
        ...newRecipe,
        ingredients: [...newRecipe.ingredients, {
          name: '',
          quantity: 1,
          unit: ''
        }]
      });
    }
  };


  // Remove recipe item
  const handleRemoveRecipeItem = (index: number) => {
    if (isEditing && selectedRecipe) {
      const updatedIngredients = selectedRecipe.ingredients.filter((_, i) => i !== index);
      setSelectedRecipe({
        ...selectedRecipe,
        ingredients: updatedIngredients,
      });
    } else {
      const updatedIngredients = newRecipe.ingredients.filter((_, i) => i !== index);
      setNewRecipe({
        ...newRecipe,
        ingredients: updatedIngredients,
      });
    }
  };

  // Save recipe
  const handleSaveRecipe = () => {
    if (isEditing && selectedRecipe) {
      if (selectedRecipe.ingredients.some(ingredient => !ingredient.name.trim())) {
        setNewRecipeError('Ingredient names cannot be empty.');
        return;
      }
      updateRecipe(selectedRecipe);
      setRecipes(prev => prev.map(r => r.id === selectedRecipe.id ? selectedRecipe : r));
      setSelectedRecipe(null);
      setIsEditing(false);
    } else {
      if (newRecipe.ingredients.some(ingredient => !ingredient.name.trim())) {
        setNewRecipeError('Ingredient names cannot be empty.');
        return;
      }
      // Skip pantry availability validation per request
      const recipeToAdd = {
        ...newRecipe,
        folder_id: newRecipe.folder_id || (currentFolder ? currentFolder.id : uncategorizedFolderId)
      };
      addRecipe(recipeToAdd);
      setRecipes(prev => [...prev, recipeToAdd]);
      setNewRecipe({
        id: '',
        meal_name: '',
        ingredients: [],
        image: null,
        folder_id: currentFolder ? currentFolder.id : uncategorizedFolderId,
        instructions: [] as string[],
      });
      setNewRecipeError('');
      setShowAddRecipe(false);
    }
  };

  const handleDeleteRecipe = (recipeId: string) => {
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
    deleteRecipe(recipeId);
  };

  const getFilteredPantryItems = (query: string) => {
    // Removed fetchAllIngredients call to prevent infinite loop; filter locally after initial fetch
    if (!query.trim()) return ingredients.slice(0, 10); // Show first 10 if no query
    return ingredients.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
  };

  // Handle starting to add a recipe from a folder
  const handleAddRecipeInFolder = (folder: Folder) => {
    setNewRecipe({
      ...newRecipe,
      folder_id: folder.id
    });
    setShowAddRecipe(true);
  };

  const handleNavigateBack = () => {
    if (showAddRecipe) {
      setShowAddRecipe(false);
      return;
    }
    if (selectedRecipe) {
      setSelectedRecipe(null);
      setIsEditing(false);
      return;
    }
    if (currentFolder) {
      setCurrentFolder(null);
      return;
    }
    onBack();
  };

  return <div className="flex flex-col w-full min-h-screen bg-linen">
    <AppHeader
      title={t('recipes.title')}
      onOpenMenu={currentFolder || selectedRecipe || showAddRecipe ? undefined : onOpenMenu}
      showBack={Boolean(currentFolder || selectedRecipe || showAddRecipe)}
      onBack={handleNavigateBack}
    />
    <div className="flex-1 overflow-y-auto">
      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 lg:px-8 py-6">
        {!showAddRecipe && !selectedRecipe && recipesLoading && recipes.length === 0 ? <Loading compact /> : !showAddRecipe && !selectedRecipe ? <>
          {/* Breadcrumb Navigation */}
          <div className="flex items-center mb-4 text-sm gap-1">
            {currentFolder && (
              <button
                type="button"
                onClick={() => setCurrentFolder(null)}
                className="p-1.5 mr-1 rounded-lg text-muted hover:text-ink hover:bg-sage/50"
                aria-label={t('recipes.backToCategories')}
              >
                <ArrowLeftIcon size={16} />
              </button>
            )}
            <button type="button" onClick={() => setCurrentFolder(null)} className="flex items-center text-muted hover:text-ink">
              <HomeIcon size={16} className="mr-1" />
              <span>{t('recipes.categories')}</span>
            </button>
            {currentFolder && <>
              <ChevronRightIcon size={16} className="mx-2 text-muted" />
              <span className="text-ink font-medium">
                {currentFolder.name}
              </span>
            </>}
          </div>
          {/* Folder View */}
          {!currentFolder ? <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-ink">
                Recipe Categories
              </h2>
              <button onClick={() => {
                setNewFolderName('');
                setShowAddFolder(true);
              }} className="flex items-center text-sm bg-sage/50 text-herb px-3 py-1.5 rounded-lg border border-line hover:bg-sage transition-colors">
                <FolderPlusIcon size={16} className="mr-1" />
                New Category
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {(folders ?? []).map(folder => <div key={folder.id} className="relative bg-surface rounded-xl border border-line shadow-sm  hover:shadow-md transition-shadow">
                <div className="p-4 cursor-pointer" onClick={() => setCurrentFolder(folder)}>
                  <div className="flex items-center mb-2">
                    <FolderIcon size={20} className="text-amber-500 mr-2" />
                    <h3 className="font-medium text-ink">
                      {folder.name}
                    </h3>
                  </div>
                  <p className="text-sm text-muted">
                    {recipes.filter(r => recipeFolderId(r) === folder.id).length}{' '}
                    recipes
                  </p>
                </div>
                {/* Folder actions */}
                <div className="absolute top-2 right-2">
                  <button onClick={e => {
                    e.stopPropagation();
                    setShowFolderActions(showFolderActions === folder.id ? null : folder.id);
                  }} className="p-1 rounded-full hover:bg-sage/50">
                    <MoreVerticalIcon size={16} className="text-muted" />
                  </button>
                  {showFolderActions === folder.id && <div className="absolute right-0 mt-1 w-36 bg-surface rounded-lg shadow-lg border border-line z-10">
                    <button onClick={e => {
                      e.stopPropagation();
                      setEditingFolder(folder);
                      setNewFolderName(folder.name);
                      setShowFolderActions(null);
                    }} className="w-full text-left px-4 py-2 text-sm text-ink hover:bg-linen flex items-center" disabled={folder.name.toLowerCase() === 'uncategorized'}>
                      <PencilIcon size={14} className="mr-2" />
                      Rename
                    </button>
                    <button onClick={e => {
                      e.stopPropagation();
                      handleAddRecipeInFolder(folder);
                      setShowFolderActions(null);
                    }} className="w-full text-left px-4 py-2 text-sm text-ink hover:bg-linen flex items-center">
                      <PlusIcon size={14} className="mr-2" />
                      Add Recipe
                    </button>
                    {folder.name.toLowerCase() !== 'uncategorized' && <button onClick={e => {
                      e.stopPropagation();
                      setFolderToDelete(folder);
                      setShowDeleteFolderConfirmation(true);
                      setShowFolderActions(null);
                    }} className="w-full text-left px-4 py-2 text-sm text-herb hover:bg-sage/50 flex items-center">
                      <TrashIcon size={14} className="mr-2" />
                      Delete
                    </button>}
                  </div>}
                </div>
                {/* Quick add recipe button */}
                <div className="absolute bottom-2 right-2">
                  <button onClick={e => {
                    e.stopPropagation();
                    handleAddRecipeInFolder(folder);
                  }} className="p-1 rounded-full bg-sage/50 hover:bg-sage text-herb" aria-label="Add recipe">
                    <PlusIcon size={16} />
                  </button>
                </div>
              </div>)}
            </div>
          </div> : <>
            {/* Search Bar */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon size={18} className="text-muted" />
              </div>
              <input type="text" placeholder={t('recipes.searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-line focus:outline-none focus:ring-2 focus:ring-herb/30 focus:border-transparent" />
            </div>
            {/* Add New Recipe Button */}
            <button onClick={() => {
              setNewRecipe({
                ...newRecipe,
                folder_id: currentFolder.id
              });
              setShowAddRecipe(true);
            }} className="w-full flex items-center justify-center gap-2 bg-surface border border-line hover:bg-linen text-ink font-medium py-3 px-4 rounded-xl mb-6 shadow-sm transition-colors">
              <PlusIcon size={18} />
              <span>{t('recipes.addRecipe')}</span>
            </button>
            {/* Recipes List */}
            <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
              {filteredRecipes.length === 0 ? <div className="p-6 text-center">
                <p className="text-muted">{t('recipes.empty')}</p>
                {searchQuery ? (
                  <p className="text-muted text-sm mt-1">
                    {t('common.tryDifferentSearch')}
                  </p>
                ) : null}
              </div> : <ul className="divide-y divide-line">
                {filteredRecipes.map(recipe => <li key={recipe.id} className="p-4">
                  <div className="flex justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => {
                      setSelectedRecipe(recipe);
                      setIsEditing(false);
                    }}>
                      <div className="flex items-center mb-1">
                        {hasRecipeImage(recipe) && <ImageIcon size={16} className="ml-2 text-muted" />}
                      </div>
                      {/* Fixed: Added missing meal_name display */}
                      <h3 className="font-medium text-ink mb-1">
                        {recipe.meal_name}
                      </h3>
                      <p className="text-muted text-xs mt-1">
                        {recipe.ingredients.length} ingredient
                        {recipe.ingredients.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button onClick={() => {
                        setSelectedRecipe(toEditRecipe(recipe));
                        setIsEditing(true);
                      }} className="p-1.5 rounded-full hover:bg-sage/50 text-herb" aria-label="Edit recipe">
                        <EditIcon size={18} />
                      </button>
                      <button onClick={() => handleDeleteRecipe(recipe.id)} className="p-1.5 rounded-full hover:bg-sage/50 text-herb" aria-label="Delete recipe">
                        <TrashIcon size={18} />
                      </button>
                    </div>
                  </div>
                </li>)}
              </ul>}
            </div>
          </>}
        </> : selectedRecipe ?
          // Recipe Detail View
          <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden mb-6">
            <div className="p-4 border-b border-line bg-linen flex justify-between items-center">
              <h2 className="font-semibold text-ink">
                {isEditing ? 'Edit Recipe' : 'Recipe Details'}
              </h2>
              <button onClick={() => {
                setSelectedRecipe(null);
                setIsEditing(false);
              }} className="p-1 rounded-full hover:bg-sage/60" aria-label="Close">
                <XIcon size={18} className="text-muted" />
              </button>
            </div>
            <div className="p-6">
              {isEditing ?
                // Edit Recipe Form
                <div className="space-y-4">
                  <div>
                    <label htmlFor="meal-name-edit" className="block text-ink mb-2">
                      Meal Name
                    </label>
                    <input
                      id="meal-name-edit"
                      type="text"
                      value={selectedRecipe.meal_name}
                      onChange={e => setSelectedRecipe({ ...selectedRecipe, meal_name: e.target.value })}
                      placeholder="Enter what you cooked"
                      className="w-full p-3 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-herb/30 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="folder-edit" className="block text-ink mb-2">
                      {t('recipes.folder')}
                    </label>
                    <select
                      id="folder-edit"
                      value={recipeFolderId(selectedRecipe)}
                      onChange={e => setSelectedRecipe({ ...selectedRecipe, folder_id: e.target.value })}
                      className="w-full p-3 border border-line rounded-xl bg-surface focus:outline-none focus:ring-2 focus:ring-herb/30 focus:border-transparent"
                    >
                      {(folders ?? []).map(folder => (
                        <option key={folder.id} value={folder.id}>{folder.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Recipe Image */}
                  <div>
                    <label className="block text-ink text-sm font-medium mb-1">
                      Meal Photo{' '}
                      (optional)
                    </label>
                    {!hasRecipeImage(selectedRecipe) ? <div className="border-2 border-dashed border-line rounded-xl p-6 text-center">
                      <ImageIcon size={24} className="mx-auto text-muted mb-2" />
                      <p className="text-muted mb-2">
                        Add a photo of your meal
                      </p>
                      <label className="cursor-pointer bg-linen hover:bg-sage/50 text-ink py-2 px-4 rounded-lg border border-line inline-block transition-colors">
                        Upload Image
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div> : <div className="relative rounded-xl overflow-hidden h-40">
                      <img src={selectedRecipe.image!.url} alt="Meal" className="w-full h-full object-cover" />
                      <button onClick={() => handleImageRemove(selectedRecipe.image!.public_id)} className="absolute top-2 right-2 bg-surface/80 p-1 rounded-full hover:bg-surface text-herb" aria-label="Remove image">
                        <XIcon size={20} />
                      </button>
                    </div>}
                  </div>
                  {/* Instructions / Steps */}
                  <div>
                    <label htmlFor="instructions-edit" className="block text-ink text-sm font-medium mb-1">
                      Instructions / Steps
                    </label>
                    <textarea
                      id="instructions-edit"
                      value={getInstructionsText(selectedRecipe)}
                      onChange={e => setInstructionsFromText(e.target.value, 'selected')}
                      placeholder="One step per line"
                      rows={6}
                      className="w-full p-3 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-herb/30 focus:border-transparent resize-y"
                    />
                  </div>
                  {/* Items List */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-ink text-sm font-medium">
                        {selectedRecipe ? 'Ingredients' : 'Items'}
                      </label>
                      <button onClick={handleAddRecipeItem} className="text-sm flex items-center text-herb hover:text-herb-deep">
                        <PlusIcon size={16} className="mr-1" />
                        Add {selectedRecipe ? 'Ingredient' : 'Item'}
                      </button>
                    </div>
                    {selectedRecipe.ingredients.map((item: any, index: number) => <div key={index} className="flex gap-1.5 items-center mb-2">
                      <div className="flex-1 min-w-0 relative" ref={activeItemIndex === index ? ingredientDropdownRef : null}>
                        <div className="relative">
                          <input type="text" value={item.name} onChange={e => {
                            handleUpdateRecipeItem(index, 'name', e.target.value);
                            setItemSearchQuery(e.target.value);
                            setActiveItemIndex(index);
                            setShowIngredientDropdown(true);
                          }} onFocus={() => {
                            setActiveItemIndex(index);
                            setShowIngredientDropdown(true);
                            setItemSearchQuery(item.name);
                          }} placeholder={selectedRecipe ? 'Search ingredient...' : 'Search item...'} className="w-full p-2 pr-8 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-herb/30" />
                          <SearchIcon size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        </div>

                        {/* Dropdown Menu */}
                        {showIngredientDropdown && activeItemIndex === index && <div className="absolute z-30 w-full mt-1 bg-surface border border-line rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {getFilteredPantryItems(itemSearchQuery).length > 0 ? getFilteredPantryItems(itemSearchQuery).map(pantryItem => <button key={pantryItem.id || pantryItem.name} type="button" onMouseDown={e => {
                            e.preventDefault();
                            handleSelectIngredient(pantryItem, index);
                          }} className="w-full text-left px-3 py-2 hover:bg-sage/50 transition-colors text-sm border-b border-line last:border-b-0">
                            <div className="font-medium text-ink capitalize">
                              {pantryItem.name}
                            </div>
                            <div className="text-xs text-muted">
                              {pantryItem.default_display_unit || pantryItem.default_unit}
                            </div>
                          </button>) : <div></div>}
                        </div>}
                      </div>

                      <input type="number" min="0.1" step="any" value={item.quantity} onChange={e => handleUpdateRecipeItem(index, 'quantity', e.target.value)} className="w-16 p-2 border border-line rounded-lg" />
                      <UnitSelect
                        kind={item.unit_kind || preferredUnitForIngredient({ default_unit: item.unit, unit_kind: item.unit_kind, base_unit: item.base_unit, default_display_unit: item.default_display_unit }, measurementSystem).kind}
                        value={item.unit}
                        onChange={unit => handleUpdateRecipeItem(index, 'unit', unit)}
                        measurementSystem={measurementSystem}
                        preferSystemUnits
                        className="w-20 p-2 border border-line rounded-lg bg-surface"
                      />
                      <button onClick={() => handleRemoveRecipeItem(index)} className="p-1 rounded-full hover:bg-sage/50 text-herb">
                        <TrashIcon size={16} />
                      </button>
                    </div>)}
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button onClick={() => {
                      setSelectedRecipe(null);
                      setIsEditing(false);
                    }} className="w-1/2 bg-sage/40 text-ink py-2 rounded-lg">
                      Cancel
                    </button>
                    <button onClick={handleSaveRecipe} className="w-1/2 bg-herb text-white py-2 rounded-lg">
                      Save Changes
                    </button>
                  </div>
                </div> :
                // View Recipe Details
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-bold text-xl text-ink">
                        {selectedRecipe.meal_name}
                      </h3>
                      <p className="text-sm text-muted mt-1">
                        {t('recipes.folder')}: {(folders ?? []).find(f => f.id === recipeFolderId(selectedRecipe))?.name ?? '—'}
                      </p>
                    </div>
                  </div>
                  {hasRecipeImage(selectedRecipe) && <div className="rounded-xl overflow-hidden h-40 my-4">
                    <img src={selectedRecipe.image!.url} alt="Meal" className="w-full h-full object-cover" />
                  </div>}
                  <div className="border-t border-b border-line py-4">
                    <h4 className="font-medium text-ink mb-2">
                      Ingredients
                    </h4>
                    <ul className="space-y-2">
                      {selectedRecipe.ingredients.map((item, index) => <li key={index} className="flex justify-between">
                        <div>
                          <span className="text-ink">{item.name}</span>
                          {Number(item.quantity) > 0 && (
                          <QuantityLabel
                            className="text-muted text-sm ml-2"
                            quantity={Number(item.quantity)}
                            unit={item.unit}
                            unitKind={item.unit_kind}
                            baseUnit={item.base_unit}
                            defaultDisplayUnit={item.default_display_unit}
                            measurementSystem={measurementSystem}
                          />
                          )}
                        </div>
                      </li>)}
                    </ul>
                  </div>
                  {(selectedRecipe.instructions?.length ?? 0) > 0 && (
                    <div className="border-b border-line pb-4">
                      <h4 className="font-medium text-ink mb-2">
                        Instructions
                      </h4>
                      <ol className="space-y-3">
                        {selectedRecipe.instructions.map((step, index) => (
                          <li key={index} className="flex">
                            <div className="bg-sage rounded-full w-6 h-6 flex items-center justify-center text-herb-deep font-medium mr-3 flex-shrink-0 mt-0.5 text-sm">
                              {index + 1}
                            </div>
                            <p className="text-ink">{step}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <button onClick={() => {
                      if (!selectedRecipe) return;
                      setSelectedRecipe(toEditRecipe(selectedRecipe));
                      setIsEditing(true);
                    }} className="w-full bg-sage/50 text-herb border border-blue-100 py-2 rounded-lg flex items-center justify-center">
                      <EditIcon size={16} className="mr-1" />
                      Edit Recipe
                    </button>
                  </div>
                </div>}
            </div>
          </div> :
          // Add New Recipe Form
          <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden mb-6">
            <div className="p-4 border-b border-line bg-linen flex justify-between items-center">
              <h2 className="font-semibold text-ink">{t('recipes.addRecipe')}</h2>
              <button onClick={() => setShowAddRecipe(false)} className="p-1 rounded-full hover:bg-sage/60" aria-label="Close">
                <XIcon size={18} className="text-muted" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="meal-name" className="block text-ink mb-2">
                    Meal Name
                  </label>
                  <input type="text" id="meal-name" value={newRecipe.meal_name} onChange={e => setNewRecipe({ ...newRecipe, meal_name: e.target.value })} placeholder="Enter what you cooked" className="w-full p-3 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-herb/30 focus:border-transparent" />
                </div>
                <div>
                  <label htmlFor="folder-new" className="block text-ink mb-2">
                    {t('recipes.folder')}
                  </label>
                  <select
                    id="folder-new"
                    value={newRecipe.folder_id || uncategorizedFolderId}
                    onChange={e => setNewRecipe({ ...newRecipe, folder_id: e.target.value })}
                    className="w-full p-3 border border-line rounded-xl bg-surface focus:outline-none focus:ring-2 focus:ring-herb/30 focus:border-transparent"
                  >
                    {(folders ?? []).map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                </div>
                {/* Image Upload Section */}
                <div>
                  <label className="block text-ink mb-2">
                    Recipe Image (optional)
                  </label>
                  {!hasRecipeImage(newRecipe) ? (
                    <div className="border-2 border-dashed border-line rounded-xl p-6 text-center">
                      <ImageIcon size={32} className="mx-auto text-muted mb-2" />
                      <p className="text-muted mb-2">Add a photo of your Recipe</p>
                      <label className="cursor-pointer bg-linen hover:bg-sage/50 text-ink py-2 px-4 rounded-lg border border-line inline-block transition-colors">
                        Upload Image
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden aspect-[4/3]">
                      <img
                        src={newRecipe.image!.url}
                        alt="Recipe photo"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />

                      <button
                        onClick={() => handleImageRemove(newRecipe.image!.public_id)}
                        className="absolute top-2 right-2 bg-surface/80 p-1 rounded-full hover:bg-surface text-herb"
                        aria-label="Remove image"
                      >
                        <XIcon size={20} />
                      </button>
                    </div>
                  )}
                </div>
                {/* Instructions / Steps */}
                <div>
                  <label htmlFor="instructions-new" className="block text-ink mb-2">
                    Instructions / Steps
                  </label>
                  <textarea
                    id="instructions-new"
                    value={getInstructionsText(newRecipe)}
                    onChange={e => setInstructionsFromText(e.target.value, 'new')}
                    placeholder="One step per line"
                    rows={5}
                    className="w-full p-3 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-herb/30 focus:border-transparent resize-y"
                  />
                </div>
                {/* Items List */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-ink text-sm font-medium">
                      Items
                    </label>
                    <button onClick={handleAddRecipeItem} className="text-sm flex items-center text-herb hover:text-herb-deep">
                      <PlusIcon size={16} className="mr-1" />
                      Add Item
                    </button>
                  </div>
                  {newRecipe.ingredients.map((item, index) => <div key={index} className="flex gap-2 items-center mb-2">
                    {/* Searchable Ingredient Input */}
                    <div className="flex-1 min-w-0 relative" ref={activeItemIndex === index ? ingredientDropdownRef : null}>
                      <div className="relative">
                        <input type="text" value={item.name} onChange={e => {
                          handleUpdateRecipeItem(index, 'name', e.target.value);
                          setItemSearchQuery(e.target.value);
                          setActiveItemIndex(index);
                          setShowIngredientDropdown(true);
                        }} onFocus={() => {
                          setActiveItemIndex(index);
                          setShowIngredientDropdown(true);
                          setItemSearchQuery(item.name);
                        }} placeholder="Search item..." className="w-full p-2 pr-8 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-herb/30" />
                        <SearchIcon size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                      </div>

                      {/* Dropdown Menu */}
                      {showIngredientDropdown && activeItemIndex === index && <div className="absolute z-30 w-full mt-1 bg-surface border border-line rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {getFilteredPantryItems(itemSearchQuery).length > 0 ? getFilteredPantryItems(itemSearchQuery).map(pantryItem => <button key={pantryItem.id || pantryItem.name} type="button" onMouseDown={e => {
                          e.preventDefault();
                          handleSelectIngredient(pantryItem, index);
                        }} className="w-full text-left px-3 py-2 hover:bg-sage/50 transition-colors text-sm border-b border-line last:border-b-0">
                          <div className="font-medium text-ink capitalize">
                            {pantryItem.name}
                          </div>
                          <div className="text-xs text-muted">
                            {pantryItem.default_display_unit || pantryItem.default_unit}
                          </div>
                        </button>) : <div></div>}
                      </div>}
                    </div>

                    <input type="number" min="0.1" step="any" value={item.quantity} onChange={e => handleUpdateRecipeItem(index, 'quantity', e.target.value)} className="w-14 p-2 text-sm border border-line rounded-lg" />
                    <UnitSelect
                      kind={item.unit_kind || preferredUnitForIngredient({ default_unit: item.unit, unit_kind: item.unit_kind, base_unit: item.base_unit, default_display_unit: item.default_display_unit }, measurementSystem).kind}
                      value={item.unit}
                      onChange={unit => handleUpdateRecipeItem(index, 'unit', unit)}
                      measurementSystem={measurementSystem}
                      preferSystemUnits
                      className="w-16 p-2 text-sm border border-line rounded-lg bg-surface"
                    />
                    <button onClick={() => handleRemoveRecipeItem(index)} className="p-1 rounded-full hover:bg-sage/50 text-herb" aria-label={`Remove ${item.name || 'item'}`}>
                      <TrashIcon size={16} />
                      <span className="sr-only">Remove {item.name || 'item'}</span>
                    </button>
                  </div>)}
                </div>
                {newRecipeError && <p className="text-herb text-sm mb-2">{newRecipeError}</p>}
                <button onClick={handleSaveRecipe} disabled={!newRecipe.meal_name.trim() || newRecipe.ingredients.length === 0} className={`w-full py-3 px-4 rounded-xl font-medium ${newRecipe.meal_name.trim() && newRecipe.ingredients.length > 0 ? 'bg-herb hover:bg-herb-deep text-white' : 'bg-sage/40 text-muted cursor-not-allowed'} transition-colors`}>
                  Log This Meal
                </button>
              </div>
            </div>
          </div>}
      </main>
      {/* Add Folder Modal */}
      {showAddFolder && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-surface rounded-xl shadow-lg max-w-sm w-full">
          <div className="p-4 border-b border-line flex justify-between items-center">
            <h3 className="font-medium text-ink">Create New Category</h3>
            <button onClick={() => setShowAddFolder(false)} className="p-1 rounded-full hover:bg-sage/50">
              <XIcon size={20} className="text-muted" />
            </button>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <label htmlFor="folder-name" className="block text-ink mb-2">
                Category Name
              </label>
              <input type="text" id="folder-name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Enter category name" className="w-full p-3 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-herb/30 focus:border-transparent" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowAddFolder(false)} className="w-1/2 bg-sage/40 text-ink py-2 rounded-lg">
                Cancel
              </button>
              <button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className={`w-1/2 ${newFolderName.trim() ? 'bg-herb text-white' : 'bg-sage/60 text-muted cursor-not-allowed'} py-2 rounded-lg`}>
                Create
              </button>
            </div>
          </div>
        </div>
      </div>}
      {/* Edit Folder Modal */}
      {editingFolder && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-surface rounded-xl shadow-lg max-w-sm w-full">
          <div className="p-4 border-b border-line flex justify-between items-center">
            <h3 className="font-medium text-ink">Rename Category</h3>
            <button onClick={() => setEditingFolder(null)} className="p-1 rounded-full hover:bg-sage/50">
              <XIcon size={20} className="text-muted" />
            </button>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <label htmlFor="folder-name-edit" className="block text-ink mb-2">
                Category Name
              </label>
              <input type="text" id="folder-name-edit" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Enter category name" className="w-full p-3 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-herb/30 focus:border-transparent" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditingFolder(null)} className="w-1/2 bg-sage/40 text-ink py-2 rounded-lg">
                Cancel
              </button>
              <button onClick={handleUpdateFolder} disabled={!newFolderName.trim()} className={`w-1/2 ${newFolderName.trim() ? 'bg-herb text-white' : 'bg-sage/60 text-muted cursor-not-allowed'} py-2 rounded-lg`}>
                Update
              </button>
            </div>
          </div>
        </div>
      </div>}
      {/* Delete Folder Confirmation Modal */}
      {showDeleteFolderConfirmation && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-surface rounded-xl shadow-lg max-w-sm w-full">
          <div className="p-6">
            <div className="flex items-center text-herb mb-4">
              <AlertCircleIcon size={24} className="mr-2" />
              <h3 className="text-lg font-medium">Delete Category</h3>
            </div>
            <p className="text-muted mb-2">
              Are you sure you want to delete "{folderToDelete?.name}"?
            </p>
            <p className="text-muted text-sm mb-6">
              All recipes in this category will be moved to "Uncategorized".
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteFolderConfirmation(false)} className="px-4 py-2 bg-sage/40 hover:bg-sage/60 text-ink rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteFolder} className="px-4 py-2 bg-herb hover:bg-herb-deep text-white rounded-lg transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>}
    </div></div>;
}