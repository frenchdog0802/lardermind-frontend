import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, CheckIcon, SearchIcon, TrashIcon } from 'lucide-react';
import { usePantry } from '../contexts/pantryContext';
import { IngredientEntry, ShoppingListItem } from '../api/types';
import useSearchIngredients from '../hooks/useSearchIngredient';
import { NumberInput } from './NumberInput';
import { UnitSelect, QuantityLabel, preferredUnitForIngredient } from './UnitSelect';
import { AppHeader } from './AppHeader';
import type { MeasurementSystem } from '../utils/units';

interface ShoppingListProps {
    onBack: () => void;
    onOpenMenu?: () => void;
}

export function ShoppingList({ onBack: _onBack, onOpenMenu }: ShoppingListProps) {
    const { t } = useTranslation();
    const {
        shoppingList: oriShoppingList,
        ingredients,
        // shopping list functions
        addShoppingListItem,
        updateShoppingListItem,
        removeShoppingListItem,
        fetchAllShoppingListItems,
        fetchAllPantryItems,
        userSettings,
    } = usePantry();

    const measurementSystem = (userSettings.measurement_unit === 'imperial' ? 'imperial' : 'metric') as MeasurementSystem;
    const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [shoppingSearchQuery, setShoppingSearchQuery] = useState('');
    const [newShoppingItem, setNewShoppingItem] = useState({
        name: '',
        quantity: 1,
        unit: '',
        checked: false
    });
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [isAddingShoppingItem, setIsAddingShoppingItem] = useState(false);
    const [isCompletingAll, setIsCompletingAll] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);  // ???????????????

    // Shopping item search dropdown????? name???? debounce??
    const { filteredIngredients: filteredShoppingIngredients, loading: shoppingLoading } = useSearchIngredients(
        newShoppingItem.name,
        ingredients
    );

    // Auto-select if exactly one match and exact name match?? useMemo ?????????????
    const autoSelectLogic = useMemo(() => {
        if (filteredShoppingIngredients.length === 1) {
            const match = filteredShoppingIngredients[0];
            if (match.name.toLowerCase() === newShoppingItem.name.toLowerCase()) {
                setNewShoppingItem(prev => ({
                    ...prev,
                    name: match.name,
                    unit: preferredUnitForIngredient(match, measurementSystem).unit,
                }));
                setDropdownVisible(false);
            }
        }
    }, [newShoppingItem.name, filteredShoppingIngredients]);

    useEffect(() => {
        const fetchData = async () => {
            const data = await fetchAllShoppingListItems();
            setShoppingList(data);
        };
        fetchData();
    }, []);


    useEffect(() => {
        autoSelectLogic;
    }, [autoSelectLogic]);

    // Filter shopping list items
    const filteredShoppingItems = useMemo(() => {
        return shoppingList.filter(item => {
            const isEnglish = /^[\x00-\x7F]*$/.test(item.name);
            return isEnglish
                ? item.name.toLowerCase().includes(shoppingSearchQuery.toLowerCase())
                : item.name.includes(shoppingSearchQuery);
        });
    }, [shoppingList, shoppingSearchQuery]);

    // Sync oriShoppingList to local shoppingList
    useEffect(() => {
        setShoppingList(oriShoppingList);
    }, [oriShoppingList]);

    // ?????????????????
    const handleSelectIngredient = (ingredient: IngredientEntry) => {
        setNewShoppingItem({
            name: ingredient.name,
            unit: preferredUnitForIngredient(ingredient, measurementSystem).unit,
            quantity: 1,
            checked: false
        });
        setDropdownVisible(false);
        setSelectedIndex(-1);
    };

    const handleAddShoppingItem = () => {
        if (!newShoppingItem.name.trim()) return;
        // Check if item already exists in shopping list
        const existingItem = shoppingList.find(item => item.name.toLowerCase() === newShoppingItem.name.toLowerCase());
        if (existingItem) {
            updateShoppingListItem({ ...existingItem, quantity: newShoppingItem.quantity });
        } else {
            // Add new item
            addShoppingListItem({ ...newShoppingItem });
        }
        // Reset form
        setNewShoppingItem({
            name: '',
            quantity: 1,
            unit: '',
            checked: false
        });
        setIsAddingShoppingItem(false);
        setDropdownVisible(false);
    };

    const handleTogglePurchased = async (id: string) => {
        const item = shoppingList.find(i => i.id === id);
        if (!item) return;
        const updatedItem = { ...item, checked: !item.checked };
        const res = await updateShoppingListItem(updatedItem);
        if (res.success) {
            setShoppingList(prevList =>
                prevList.map(listItem =>
                    listItem.id === id
                        ? { ...listItem, checked: updatedItem.checked }
                        : listItem
                )
            );

            if (shoppingSearchQuery) {
                setShoppingSearchQuery('');
            }

            await fetchAllPantryItems();

            const newChecked = updatedItem.checked;
            setMessage(newChecked ? 'Purchased! Added to your pantry.' : 'Unmarked. Quantity restored in pantry.');
            setShowMessage(true);
            setTimeout(() => setShowMessage(false), 3000);
        }
    };

    const handleRemoveShoppingItem = (id: string) => {
        if (removeShoppingListItem) {
            removeShoppingListItem(id);
        }
    };

    const uncheckedCount = useMemo(
        () => shoppingList.filter(item => !item.checked).length,
        [shoppingList]
    );

    const handleCompleteAll = async () => {
        const unchecked = shoppingList.filter(item => !item.checked);
        if (unchecked.length === 0 || isCompletingAll) return;

        setIsCompletingAll(true);
        try {
            const results = await Promise.all(
                unchecked.map(item => updateShoppingListItem({ ...item, checked: true }))
            );
            const allSucceeded = results.every(res => res.success);
            if (allSucceeded) {
                setShoppingList(prevList =>
                    prevList.map(listItem =>
                        listItem.checked ? listItem : { ...listItem, checked: true }
                    )
                );
                if (shoppingSearchQuery) {
                    setShoppingSearchQuery('');
                }
                await fetchAllPantryItems();
                setMessage(`All ${unchecked.length} item${unchecked.length === 1 ? '' : 's'} purchased and added to your pantry.`);
                setShowMessage(true);
                setTimeout(() => setShowMessage(false), 3000);
            } else {
                await fetchAllShoppingListItems();
                await fetchAllPantryItems();
                setMessage('Some items could not be completed. Please try again.');
                setShowMessage(true);
                setTimeout(() => setShowMessage(false), 3000);
            }
        } finally {
            setIsCompletingAll(false);
        }
    };

    return (
        <div className="flex flex-col w-full min-h-screen bg-linen">
            <AppHeader title={t('shopping.title')} onOpenMenu={onOpenMenu} />
            <div className="flex-1 overflow-y-auto">
                {/* Main Content */}
                <main className="flex-1 max-w-3xl mx-auto w-full px-6 lg:px-8 py-6">
                    {/* Success Message Alert */}
                    {showMessage && (
                        <div className="mb-4 p-3 bg-sage/50 border border-line rounded-xl text-herb-deep text-sm font-medium animate-fade-in">
                            {message}
                        </div>
                    )}

                    {/* Search Bar */}
                    <div className="relative mb-6">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon size={18} className="text-muted" />
                        </div>
                        <input
                            type="text"
                            placeholder={t('shopping.searchPlaceholder')}
                            value={shoppingSearchQuery}
                            onChange={e => setShoppingSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-line focus:outline-none focus:ring-2 focus:ring-herb/30 focus:border-transparent"
                        />
                    </div>

                    {/* Add New Shopping Item Button */}
                    {!isAddingShoppingItem ? (
                        <button
                            onClick={() => setIsAddingShoppingItem(true)}
                            className="w-full flex items-center justify-center gap-2 bg-surface border border-line hover:bg-linen text-ink font-medium py-3 px-4 rounded-xl mb-6 shadow-sm transition-colors"
                        >
                            <PlusIcon size={18} />
                            <span>{t('shopping.addItem')}</span>
                        </button>
                    ) : (
                        <div className="bg-surface p-4 rounded-xl shadow-sm border border-line mb-6">
                            <h3 className="font-medium text-ink mb-3">{t('shopping.addItemTitle')}</h3>
                            <div className="space-y-3 relative">
                                <input
                                    type="text"
                                    placeholder={t('shopping.itemNamePlaceholder')}
                                    value={newShoppingItem.name}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        setNewShoppingItem({ ...newShoppingItem, name: newName });
                                        setDropdownVisible(newName.length > 0);
                                        setSelectedIndex(-1);  // ???????
                                    }}
                                    onKeyDown={(e) => {
                                        if (!dropdownVisible || filteredShoppingIngredients.length === 0) return;

                                        switch (e.key) {
                                            case 'ArrowDown':
                                                e.preventDefault();
                                                setSelectedIndex(prev => (prev < filteredShoppingIngredients.length - 1 ? prev + 1 : 0));
                                                break;
                                            case 'ArrowUp':
                                                e.preventDefault();
                                                setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredShoppingIngredients.length - 1));
                                                break;
                                            case 'Enter':
                                                e.preventDefault();
                                                if (selectedIndex >= 0) {
                                                    const selected = filteredShoppingIngredients[selectedIndex];
                                                    handleSelectIngredient(selected);
                                                } else if (filteredShoppingIngredients.length === 1) {
                                                    // Fallback to auto-select
                                                    handleSelectIngredient(filteredShoppingIngredients[0]);
                                                }
                                                break;
                                            case 'Escape':
                                                setDropdownVisible(false);
                                                setSelectedIndex(-1);
                                                break;
                                        }
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => setDropdownVisible(false), 200);
                                    }}
                                    className="w-full p-2 border border-line rounded-lg"
                                />

                                {dropdownVisible && (
                                    <ul className="absolute z-30 w-full bg-surface border border-line rounded-lg shadow-lg max-h-40 overflow-y-auto mt-1">
                                        {shoppingLoading ? (
                                            <li className="p-3 text-center text-muted text-sm flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                                                Loading...
                                            </li>
                                        ) : filteredShoppingIngredients.length > 0 ? (
                                            filteredShoppingIngredients.map((ingredient: IngredientEntry, index: number) => {
                                                const isSelected = index === selectedIndex;
                                                const query = newShoppingItem.name.toLowerCase();
                                                const highlightedName = ingredient.name.replace(
                                                    new RegExp(`(${query})`, 'gi'),
                                                    '<mark class="bg-yellow-200">$1</mark>'
                                                );
                                                return (
                                                    <li key={ingredient.id} className={`p-3 ${isSelected ? 'bg-sage/50' : 'hover:bg-sage/50'}`}>
                                                        <button
                                                            type="button"
                                                            onMouseDown={e => {
                                                                e.preventDefault();
                                                                handleSelectIngredient(ingredient);
                                                            }}
                                                            className={`w-full text-left ${isSelected ? 'font-medium' : ''}`}
                                                            dangerouslySetInnerHTML={{ __html: highlightedName + ` <span class="text-sm text-muted">(${ingredient.default_display_unit || ingredient.default_unit || ''})</span>` }}
                                                        />
                                                    </li>
                                                );
                                            })
                                        ) : (
                                            <li className="p-3 text-center text-muted text-sm">
                                                No matching ingredients. Try typing more letters.
                                            </li>
                                        )}
                                    </ul>
                                )}

                                <div className="flex gap-2">
                                    <NumberInput
                                        min={0.1}
                                        step={0.5}
                                        value={newShoppingItem.quantity}
                                        onChange={value =>
                                            setNewShoppingItem({
                                                ...newShoppingItem,
                                                quantity: value
                                            })
                                        }
                                        className="w-1/3 p-2 rounded-lg"
                                    />
                                    <UnitSelect
                                        kind={preferredUnitForIngredient(
                                            ingredients.find(i => i.name.toLowerCase() === newShoppingItem.name.toLowerCase()) || {
                                                default_unit: newShoppingItem.unit,
                                            },
                                            measurementSystem
                                        ).kind}
                                        value={newShoppingItem.unit}
                                        onChange={unit => setNewShoppingItem({ ...newShoppingItem, unit })}
                                        measurementSystem={measurementSystem}
                                        preferSystemUnits
                                        className="w-2/3 p-2 border border-line rounded-lg bg-surface"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setNewShoppingItem({ name: '', quantity: 1, unit: '', checked: false });
                                            setIsAddingShoppingItem(false);
                                            setDropdownVisible(false);
                                        }}
                                        className="w-1/2 bg-sage/40 text-ink py-2 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button onClick={handleAddShoppingItem} className="w-1/2 bg-blue-600 text-white py-2 rounded-lg">
                                        Add Item
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
                        <div className="p-4 border-b border-line bg-linen flex items-center justify-between gap-3">
                            <h2 className="font-semibold text-ink">{t('shopping.itemsToBuy')}</h2>
                            <button
                                type="button"
                                onClick={handleCompleteAll}
                                disabled={uncheckedCount === 0 || isCompletingAll}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    uncheckedCount === 0 || isCompletingAll
                                        ? 'bg-sage/30 text-muted cursor-not-allowed'
                                        : 'bg-herb text-white hover:bg-herb-deep'
                                }`}
                                aria-label="Complete all items"
                            >
                                <CheckIcon size={14} />
                                {isCompletingAll ? 'Completing?' : 'Complete all'}
                            </button>
                        </div>
                        {filteredShoppingItems.length === 0 ? (
                            <div className="p-6 text-center">
                                <p className="text-muted">{t('shopping.empty')}</p>
                                {shoppingSearchQuery ? (
                                    <p className="text-muted text-sm mt-1">Try a different search term</p>
                                ) : null}
                            </div>
                        ) : (
                            <ul className="divide-y divide-line">
                                {filteredShoppingItems.map(item => (
                                    <li key={item.id} className={`px-4 py-3.5 ${item.checked ? 'bg-linen' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleTogglePurchased(item.id)}
                                                className={`w-5 h-5 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${item.checked ? 'bg-sage/500 border-green-500' : 'border-line hover:border-gray-400'}`}
                                                aria-label={item.checked ? 'Mark as not purchased' : 'Mark as purchased'}
                                            >
                                                {item.checked && <CheckIcon size={12} className="text-white" />}
                                            </button>
                                            <div className={`flex-1 min-w-0 ${item.checked ? 'line-through opacity-50' : ''}`}>
                                                <span className="font-semibold text-ink capitalize">{item.name}</span>
                                                <QuantityLabel
                                                    className="text-sm text-muted ml-2"
                                                    quantity={item.quantity}
                                                    unit={item.unit}
                                                    unitKind={item.unit_kind}
                                                    baseUnit={item.base_unit}
                                                    defaultDisplayUnit={item.default_display_unit}
                                                    measurementSystem={measurementSystem}
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleRemoveShoppingItem(item.id)}
                                                className="p-1.5 flex-shrink-0 rounded-full hover:bg-sage/50 text-muted hover:text-herb transition-colors"
                                                aria-label="Remove item"
                                            >
                                                <TrashIcon size={16} />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}