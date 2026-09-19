import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, MinusIcon, TrashIcon, SearchIcon, PackageIcon } from 'lucide-react';
import { usePantry } from '../contexts/pantryContext';
import { IngredientEntry, PantryItem } from '../api/types';
import useSearchIngredients from '../hooks/useSearchIngredient';
import { NumberInput } from './NumberInput';
import { UnitSelect, QuantityLabel, preferredUnitForIngredient } from './UnitSelect';
import { AppHeader } from './AppHeader';
import type { MeasurementSystem } from '../utils/units';

interface PantryInventoryProps {
    onBack: () => void;
    onOpenMenu?: () => void;
}

export function PantryInventory({ onBack: _onBack, onOpenMenu }: PantryInventoryProps) {
    const { t } = useTranslation();
    const {
        pantryItems: oriPantryItems,
        updatePantryItem,
        addPantryItem,
        removePantryItem,
        ingredients,
        fetchAllPantryItems,
        userSettings,
    } = usePantry();

    const measurementSystem = (userSettings.measurement_unit === 'imperial' ? 'imperial' : 'metric') as MeasurementSystem;
    const [pantryItems, setPantryItems] = useState<PantryItem[]>(oriPantryItems);
    const [searchQuery, setSearchQuery] = useState('');
    const [newItem, setNewItem] = useState({
        name: '',
        quantity: 1,
        unit: '',
    });
    const [showDropdown, setShowDropdown] = useState(false);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);  // ???????????????

    // Pantry item search dropdown????? name???? debounce??
    const { filteredIngredients: filteredPantryIngredients, loading: pantryLoading } = useSearchIngredients(
        newItem.name,
        ingredients
    );

    // Auto-select if exactly one match and exact name match?? useMemo ?????????????
    const autoSelectLogic = useMemo(() => {
        if (filteredPantryIngredients.length === 1) {
            const match = filteredPantryIngredients[0];
            if (match.name.toLowerCase() === newItem.name.toLowerCase()) {
                setNewItem(prev => ({
                    ...prev,
                    name: match.name,
                    unit: preferredUnitForIngredient(match, measurementSystem).unit,
                }));
                setShowDropdown(false);
                setSelectedIndex(-1);
            }
        }
    }, [newItem.name, filteredPantryIngredients]);

    useEffect(() => {
        autoSelectLogic;
    }, [autoSelectLogic]);

    // Filter pantry items based on search query
    const filteredItems = useMemo(() => {
        return pantryItems.filter(item => {
            const name = item.name ?? '';
            if (!name) return !searchQuery;
            const isEnglish = /^[\x00-\x7F]*$/.test(name);
            const matchesSearch = isEnglish
                ? name.toLowerCase().includes(searchQuery.toLowerCase())
                : name.includes(searchQuery);
            return matchesSearch;
        });
    }, [pantryItems, searchQuery]);

    useEffect(() => {
        fetchAllPantryItems();
    }, []);

    // Sync oriPantryItems to local pantryItems
    useEffect(() => {
        setPantryItems(oriPantryItems);
    }, [oriPantryItems]);

    // ?????????????????
    const handleSelectIngredient = (ingredient: IngredientEntry) => {
        setNewItem({
            name: ingredient.name,
            quantity: 1,
            unit: preferredUnitForIngredient(ingredient, measurementSystem).unit,
        });
        setShowDropdown(false);
        setSelectedIndex(-1);
    };

    const handleUpdateQuantity = (itemName: string, amount: number) => {
        const item = pantryItems.find(item => item.name === itemName);
        if (item) {
            const newQuantity = item.quantity + amount;
            if (newQuantity >= 0) {
                updatePantryItem({ ...item, quantity: newQuantity });
            }
        }
    };

    const handleRemoveItem = (itemName: string) => {
        const item = pantryItems.find(item => item.name === itemName);
        if (item && removePantryItem) {
            removePantryItem(item.id);
        }
    };

    const handleAddItem = () => {
        if (!newItem.name.trim()) return;
        // Check if item already exists
        const existingItem = pantryItems.find(item => item.name.toLowerCase() === newItem.name.toLowerCase());
        if (existingItem) {
            updatePantryItem({ ...existingItem, quantity: newItem.quantity });
        } else {
            // Add new item
            addPantryItem({ ...newItem });
        }
        // Reset form
        setNewItem({
            name: '',
            quantity: 1,
            unit: '',
        });
        setIsAddingItem(false);
    };

    const handleCancelAddItem = () => {
        setNewItem({
            name: '',
            quantity: 1,
            unit: '',
        });
        setShowDropdown(false);
        setSelectedIndex(-1);
        setIsAddingItem(false);
    };

    const needsBuyingCount = useMemo(
        () => filteredItems.filter(item => (item.item_to_buy || 0) > 0).length,
        [filteredItems]
    );

    return (
        <div className="flex flex-col w-full min-h-screen bg-linen">
            <AppHeader
                title={t('pantry.title')}
                onOpenMenu={onOpenMenu}
                subtitle={
                    <>
                        {filteredItems.length} item{filteredItems.length === 1 ? '' : 's'}
                        {needsBuyingCount > 0 ? ` · ${needsBuyingCount} to buy` : ''}
                    </>
                }
            />
            <div className="flex-1 overflow-y-auto">
                <main className="flex-1 max-w-3xl mx-auto w-full px-6 lg:px-8 py-6">
                    <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon size={18} className="text-muted" />
                        </div>
                        <input
                            type="text"
                            placeholder={t('pantry.searchPlaceholder')}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-line focus:outline-none focus:ring-2 focus:ring-herb/30 focus:border-transparent"
                        />
                    </div>

                    {!isAddingItem ? (
                        <button
                            onClick={() => setIsAddingItem(true)}
                            className="w-full flex items-center justify-center gap-2 bg-surface border border-line hover:bg-linen text-ink font-medium py-3 px-4 rounded-xl mb-4 shadow-sm transition-colors"
                        >
                            <PlusIcon size={18} />
                            <span>{t('pantry.addItem')}</span>
                        </button>
                    ) : (
                        <div className="bg-surface p-4 rounded-xl shadow-sm border border-line mb-4">
                            <h3 className="font-medium text-ink mb-3">{t('pantry.addItem')}</h3>

                            <div className="space-y-3 relative">
                                <input
                                    type="text"
                                    placeholder={t('pantry.itemNamePlaceholder')}
                                    value={newItem.name}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        setNewItem({ ...newItem, name: newName });
                                        setShowDropdown(newName.length > 0);
                                        setSelectedIndex(-1);
                                    }}
                                    onKeyDown={(e) => {
                                        if (!showDropdown || filteredPantryIngredients.length === 0) return;

                                        switch (e.key) {
                                            case 'ArrowDown':
                                                e.preventDefault();
                                                setSelectedIndex(prev => (prev < filteredPantryIngredients.length - 1 ? prev + 1 : 0));
                                                break;
                                            case 'ArrowUp':
                                                e.preventDefault();
                                                setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredPantryIngredients.length - 1));
                                                break;
                                            case 'Enter':
                                                e.preventDefault();
                                                if (selectedIndex >= 0) {
                                                    const selected = filteredPantryIngredients[selectedIndex];
                                                    handleSelectIngredient(selected);
                                                } else if (filteredPantryIngredients.length === 1) {
                                                    handleSelectIngredient(filteredPantryIngredients[0]);
                                                }
                                                break;
                                            case 'Escape':
                                                setShowDropdown(false);
                                                setSelectedIndex(-1);
                                                break;
                                        }
                                    }}
                                    onBlur={() => {
                                        // Delay close so option mousedown/click can fire first
                                        setTimeout(() => setShowDropdown(false), 200);
                                    }}
                                    className="w-full p-2 border border-line rounded-lg"
                                />

                                {showDropdown && (
                                    <ul className="absolute z-30 w-full bg-surface border border-line rounded-lg shadow-lg max-h-40 overflow-y-auto mt-1">
                                        {pantryLoading ? (
                                            <li className="p-3 text-center text-muted text-sm flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-herb mr-2"></div>
                                                Loading...
                                            </li>
                                        ) : filteredPantryIngredients.length > 0 ? (
                                            filteredPantryIngredients.map((ingredient: IngredientEntry, index: number) => {
                                                const isSelected = index === selectedIndex;
                                                const query = newItem.name.toLowerCase();
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
                                        value={newItem.quantity}
                                        onChange={value =>
                                            setNewItem({
                                                ...newItem,
                                                quantity: value
                                            })
                                        }
                                        className="w-1/3 p-2 rounded-lg"
                                    />
                                    <UnitSelect
                                        kind={preferredUnitForIngredient(
                                            ingredients.find(i => i.name.toLowerCase() === newItem.name.toLowerCase()) || {
                                                default_unit: newItem.unit,
                                            },
                                            measurementSystem
                                        ).kind}
                                        value={newItem.unit}
                                        onChange={unit => setNewItem({ ...newItem, unit })}
                                        measurementSystem={measurementSystem}
                                        preferSystemUnits
                                        className="w-2/3 p-2 border border-line rounded-lg bg-surface"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => handleCancelAddItem()} className="w-1/2 bg-sage/40 text-ink py-2 rounded-lg">
                                        Cancel
                                    </button>
                                    <button onClick={handleAddItem} className="w-1/2 bg-herb text-white py-2 rounded-lg">
                                        Add Item
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {filteredItems.length === 0 ? (
                        <div className="bg-surface rounded-xl p-10 text-center shadow-sm border border-line">
                            <PackageIcon size={40} className="mx-auto mb-3 text-muted/40" />
                            <p className="text-ink font-medium">{t('pantry.empty')}</p>
                            {searchQuery ? (
                                <p className="text-muted text-sm mt-1">{t('common.tryDifferentSearch')}</p>
                            ) : null}
                        </div>
                    ) : (
                        <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden divide-y divide-line">
                            {filteredItems.map(item => {
                                const planned = item.item_planned || 0;
                                const toBuy = item.item_to_buy || 0;
                                const isOut = (item.quantity || 0) <= 0;

                                return (
                                    <div
                                        key={item.id || item.name}
                                        className={`flex items-center gap-3 px-4 py-3.5 ${isOut ? 'bg-amber-50/40' : ''}`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-base font-semibold text-ink truncate">{item.name}</h3>
                                            </div>
                                            {(planned > 0 || toBuy > 0) && (
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm">
                                                    {planned > 0 && (
                                                        <span className="text-muted">
                                                            Planned <span className="font-semibold text-ink">{planned}</span>
                                                        </span>
                                                    )}
                                                    {toBuy > 0 && (
                                                        <span className="text-amber-800">
                                                            To buy <span className="font-semibold">{toBuy}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                onClick={() => handleUpdateQuantity(item.name, -0.5)}
                                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-sage/50 hover:bg-sage text-ink transition-colors"
                                                aria-label={`Decrease ${item.name}`}
                                            >
                                                <MinusIcon size={16} />
                                            </button>
                                            <div className="min-w-[3.25rem] text-center">
                                                <span className={`text-lg font-bold tabular-nums leading-none ${isOut ? 'text-amber-800' : 'text-ink'}`}>
                                                    <QuantityLabel
                                                        quantity={item.quantity}
                                                        unit={item.unit}
                                                        unitKind={item.unit_kind}
                                                        baseUnit={item.base_unit}
                                                        defaultDisplayUnit={item.default_display_unit}
                                                        measurementSystem={measurementSystem}
                                                    />
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleUpdateQuantity(item.name, 0.5)}
                                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-herb hover:bg-herb-deep text-white transition-colors"
                                                aria-label={`Increase ${item.name}`}
                                            >
                                                <PlusIcon size={16} />
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => handleRemoveItem(item.name)}
                                            className="p-2 rounded-lg text-muted hover:text-herb hover:bg-sage/50 transition-colors shrink-0"
                                            aria-label={`Remove ${item.name}`}
                                        >
                                            <TrashIcon size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}