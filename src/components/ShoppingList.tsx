import { useState, useEffect, useMemo, useRef } from 'react';
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

type ReviewDraft = {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    selected: boolean;
    hasIngredient: boolean;
};

export function ShoppingList({ onBack: _onBack, onOpenMenu }: ShoppingListProps) {
    const { t } = useTranslation();
    const {
        shoppingList: oriShoppingList,
        ingredients,
        addShoppingListItem,
        updateShoppingListItem,
        removeShoppingListItem,
        fetchAllShoppingListItems,
        syncShoppingItemsToPantry,
        unsyncShoppingItemsFromPantry,
        userSettings,
    } = usePantry();

    const measurementSystem = (userSettings.measurement_unit === 'imperial' ? 'imperial' : 'metric') as MeasurementSystem;
    const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [undoIds, setUndoIds] = useState<string[] | null>(null);
    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [showReview, setShowReview] = useState(false);
    const [reviewDrafts, setReviewDrafts] = useState<ReviewDraft[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [uncheckConfirmItem, setUncheckConfirmItem] = useState<ShoppingListItem | null>(null);

    const { filteredIngredients: filteredShoppingIngredients, loading: shoppingLoading } = useSearchIngredients(
        newShoppingItem.name,
        ingredients
    );

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
    }, [newShoppingItem.name, filteredShoppingIngredients, measurementSystem]);

    useEffect(() => {
        void fetchAllShoppingListItems();
    }, []);

    useEffect(() => {
        autoSelectLogic;
    }, [autoSelectLogic]);

    useEffect(() => {
        setShoppingList(oriShoppingList);
    }, [oriShoppingList]);

    useEffect(() => {
        return () => {
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        };
    }, []);

    const filteredShoppingItems = useMemo(() => {
        return shoppingList.filter(item => {
            const isEnglish = /^[\x00-\x7F]*$/.test(item.name);
            return isEnglish
                ? item.name.toLowerCase().includes(shoppingSearchQuery.toLowerCase())
                : item.name.includes(shoppingSearchQuery);
        });
    }, [shoppingList, shoppingSearchQuery]);

    const pendingSyncItems = useMemo(
        () => shoppingList.filter(item => item.checked && !item.synced_to_pantry),
        [shoppingList],
    );

    const showToast = (text: string, idsForUndo?: string[]) => {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setMessage(text);
        setShowMessage(true);
        setUndoIds(idsForUndo ?? null);
        undoTimerRef.current = setTimeout(() => {
            setShowMessage(false);
            setUndoIds(null);
        }, idsForUndo ? 10000 : 3000);
    };

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
        const existingItem = shoppingList.find(item => item.name.toLowerCase() === newShoppingItem.name.toLowerCase());
        if (existingItem) {
            void updateShoppingListItem({ ...existingItem, quantity: newShoppingItem.quantity });
        } else {
            addShoppingListItem({ ...newShoppingItem });
        }
        setNewShoppingItem({
            name: '',
            quantity: 1,
            unit: '',
            checked: false
        });
        setIsAddingShoppingItem(false);
        setDropdownVisible(false);
    };

    const applyCheckedLocally = (id: string, checked: boolean) => {
        setShoppingList(prevList =>
            prevList.map(listItem =>
                listItem.id === id ? { ...listItem, checked } : listItem
            )
        );
    };

    const handleTogglePurchased = async (id: string) => {
        const item = shoppingList.find(i => i.id === id);
        if (!item) return;

        // Unchecking a synced item needs confirmation.
        if (item.checked && item.synced_to_pantry) {
            setUncheckConfirmItem(item);
            return;
        }

        const updatedItem = { ...item, checked: !item.checked };
        const res = await updateShoppingListItem(updatedItem);
        if (res.success) {
            applyCheckedLocally(id, updatedItem.checked);
            if (shoppingSearchQuery) setShoppingSearchQuery('');
            if (updatedItem.checked) {
                showToast(t('shopping.purchasedOnly'));
            }
        }
    };

    const handleUncheckConfirm = async (alsoUnsync: boolean) => {
        const item = uncheckConfirmItem;
        setUncheckConfirmItem(null);
        if (!item) return;

        if (alsoUnsync) {
            await unsyncShoppingItemsFromPantry([item.id]);
        }
        const res = await updateShoppingListItem({ ...item, checked: false });
        if (res.success) {
            applyCheckedLocally(item.id, false);
            if (shoppingSearchQuery) setShoppingSearchQuery('');
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
                if (shoppingSearchQuery) setShoppingSearchQuery('');
                showToast(t('shopping.allPurchased', { count: unchecked.length }));
            } else {
                await fetchAllShoppingListItems();
                showToast('Some items could not be completed. Please try again.');
            }
        } finally {
            setIsCompletingAll(false);
        }
    };

    const openReviewSheet = () => {
        const drafts: ReviewDraft[] = pendingSyncItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            selected: Boolean(item.ingredient_id),
            hasIngredient: Boolean(item.ingredient_id),
        }));
        setReviewDrafts(drafts);
        setShowReview(true);
    };

    const handleConfirmSync = async () => {
        const selected = reviewDrafts.filter(d => d.selected);
        if (selected.length === 0) {
            showToast(t('shopping.syncEmpty'));
            return;
        }
        setIsSyncing(true);
        try {
            const res = await syncShoppingItemsToPantry(
                selected.map(d => ({
                    id: d.id,
                    quantity: d.quantity,
                    unit: d.unit,
                })),
            );
            if (res.success && res.data) {
                const ids = res.data.synced.map(i => i.id);
                setShowReview(false);
                showToast(t('shopping.syncSuccess', { n: ids.length }), ids);
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleUndoSync = async () => {
        if (!undoIds?.length) return;
        const ids = undoIds;
        setUndoIds(null);
        setShowMessage(false);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        await unsyncShoppingItemsFromPantry(ids);
    };

    return (
        <div className="flex flex-col w-full min-h-screen bg-linen">
            <AppHeader title={t('shopping.title')} onOpenMenu={onOpenMenu} />
            <div className="flex-1 overflow-y-auto">
                <main className="flex-1 max-w-3xl mx-auto w-full px-6 lg:px-8 py-6">
                    {showMessage && (
                        <div className="mb-4 p-3 bg-sage/50 border border-line rounded-xl text-herb-deep text-sm font-medium animate-fade-in flex items-center justify-between gap-3">
                            <span>{message}</span>
                            {undoIds && (
                                <button
                                    type="button"
                                    onClick={() => void handleUndoSync()}
                                    className="shrink-0 underline font-semibold"
                                >
                                    {t('shopping.undo')}
                                </button>
                            )}
                        </div>
                    )}

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
                                        setSelectedIndex(-1);
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
                                                    handleSelectIngredient(filteredShoppingIngredients[selectedIndex]);
                                                } else if (filteredShoppingIngredients.length === 1) {
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
                                            <li className="p-3 text-center text-muted text-sm">Loading...</li>
                                        ) : filteredShoppingIngredients.length > 0 ? (
                                            filteredShoppingIngredients.map((ingredient: IngredientEntry, index: number) => {
                                                const isSelected = index === selectedIndex;
                                                return (
                                                    <li key={ingredient.id} className={`p-3 ${isSelected ? 'bg-sage/50' : 'hover:bg-sage/50'}`}>
                                                        <button
                                                            type="button"
                                                            onMouseDown={e => {
                                                                e.preventDefault();
                                                                handleSelectIngredient(ingredient);
                                                            }}
                                                            className={`w-full text-left ${isSelected ? 'font-medium' : ''}`}
                                                        >
                                                            {ingredient.name}
                                                        </button>
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

                    {pendingSyncItems.length > 0 && (
                        <button
                            type="button"
                            onClick={openReviewSheet}
                            className="w-full mb-4 flex items-center justify-center gap-2 bg-herb text-white font-medium py-3 px-4 rounded-xl shadow-sm hover:bg-herb-deep transition-colors"
                        >
                            {t('shopping.syncToPantry', { n: pendingSyncItems.length })}
                        </button>
                    )}

                    <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
                        <div className="p-4 border-b border-line bg-linen flex items-center justify-between gap-3">
                            <h2 className="font-semibold text-ink">{t('shopping.itemsToBuy')}</h2>
                            <button
                                type="button"
                                onClick={() => void handleCompleteAll()}
                                disabled={uncheckedCount === 0 || isCompletingAll}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    uncheckedCount === 0 || isCompletingAll
                                        ? 'bg-sage/30 text-muted cursor-not-allowed'
                                        : 'bg-herb text-white hover:bg-herb-deep'
                                }`}
                                aria-label="Complete all items"
                            >
                                <CheckIcon size={14} />
                                {isCompletingAll ? 'Completing…' : 'Complete all'}
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
                                                onClick={() => void handleTogglePurchased(item.id)}
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
                                            {item.checked && (
                                                <span className={`text-xs shrink-0 px-2 py-0.5 rounded-full ${
                                                    item.synced_to_pantry
                                                        ? 'bg-sage/60 text-herb-deep'
                                                        : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {item.synced_to_pantry
                                                        ? t('shopping.syncedToPantry')
                                                        : t('shopping.pendingSync')}
                                                </span>
                                            )}
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

            {showReview && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
                    <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl border border-line max-h-[85vh] flex flex-col">
                        <div className="p-4 border-b border-line">
                            <h3 className="font-semibold text-ink text-lg">{t('shopping.syncReviewTitle')}</h3>
                            <p className="text-sm text-muted mt-1">{t('shopping.syncNonFoodHint')}</p>
                        </div>
                        <ul className="overflow-y-auto flex-1 divide-y divide-line">
                            {reviewDrafts.map((draft, idx) => (
                                <li key={draft.id} className="p-4 flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={draft.selected}
                                        onChange={e => {
                                            const selected = e.target.checked;
                                            setReviewDrafts(prev =>
                                                prev.map((d, i) => (i === idx ? { ...d, selected } : d))
                                            );
                                        }}
                                        className="mt-1"
                                    />
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="font-medium text-ink capitalize">{draft.name}</div>
                                        {!draft.hasIngredient && (
                                            <div className="text-xs text-muted">{t('shopping.syncNonFoodHint')}</div>
                                        )}
                                        <div className="flex gap-2">
                                            <NumberInput
                                                min={0.1}
                                                step={0.5}
                                                value={draft.quantity}
                                                onChange={value =>
                                                    setReviewDrafts(prev =>
                                                        prev.map((d, i) => (i === idx ? { ...d, quantity: value } : d))
                                                    )
                                                }
                                                className="w-1/3 p-2 rounded-lg"
                                            />
                                            <input
                                                type="text"
                                                value={draft.unit}
                                                onChange={e => {
                                                    const unit = e.target.value;
                                                    setReviewDrafts(prev =>
                                                        prev.map((d, i) => (i === idx ? { ...d, unit } : d))
                                                    );
                                                }}
                                                className="w-2/3 p-2 border border-line rounded-lg"
                                                aria-label={t('shopping.unit')}
                                            />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="p-4 border-t border-line flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowReview(false)}
                                className="flex-1 py-2.5 rounded-xl bg-sage/40 text-ink font-medium"
                                disabled={isSyncing}
                            >
                                {t('shopping.syncCancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleConfirmSync()}
                                className="flex-1 py-2.5 rounded-xl bg-herb text-white font-medium disabled:opacity-50"
                                disabled={isSyncing || reviewDrafts.every(d => !d.selected)}
                            >
                                {t('shopping.syncConfirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {uncheckConfirmItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl border border-line p-5 space-y-4">
                        <p className="text-ink">{t('shopping.uncheckSyncedConfirm')}</p>
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => void handleUncheckConfirm(true)}
                                className="w-full py-2.5 rounded-xl bg-herb text-white font-medium"
                            >
                                {t('shopping.uncheckSyncedYes')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleUncheckConfirm(false)}
                                className="w-full py-2.5 rounded-xl bg-sage/40 text-ink font-medium"
                            >
                                {t('shopping.uncheckSyncedNo')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setUncheckConfirmItem(null)}
                                className="w-full py-2 text-muted text-sm"
                            >
                                {t('shopping.syncCancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
