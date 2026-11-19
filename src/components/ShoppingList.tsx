import { planShoppingAdd } from '../utils/shoppingAdd';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, CheckIcon, SearchIcon, TrashIcon } from 'lucide-react';
import { usePantry } from '../contexts/pantryContext';
import { IngredientEntry, ShoppingListItem } from '../api/types';
import useSearchIngredients from '../hooks/useSearchIngredient';
import { NumberInput } from './NumberInput';
import { UnitSelect, QuantityLabel, preferredUnitForIngredient } from './UnitSelect';
import { AppHeader } from './AppHeader';
import { isAscii } from '../utils/isAscii';
import {
    INFO_TOAST_MS,
    UNDO_TOAST_MS,
    isOnShoppingList,
    shoppingBuyCount,
    shoppingEmptyState,
} from '../utils/shoppingListState';
import { createToastController } from '../utils/toastTimer';
import { resolveSelectedUnit, unitSelectOptions, type MeasurementSystem } from '../utils/units';

interface ShoppingListProps {
    onBack: () => void;
    onOpenMenu?: () => void;
    onAskAi?: (prompt: string) => void;
}

export function ShoppingList({ onBack: _onBack, onOpenMenu, onAskAi }: ShoppingListProps) {
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
    const [inFlightIds, setInFlightIds] = useState<string[]>([]);
    const undoIdsRef = useRef<string[] | null>(null);
    const pendingSyncRef = useRef<Promise<unknown> | null>(null);
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

    const filteredShoppingItems = useMemo(() => {
        return shoppingList.filter(item => {
            // Items already moved to the pantry leave "Items to Buy".
            if (item.checked && item.synced_to_pantry) return false;
            const isEnglish = isAscii(item.name);
            return isEnglish
                ? item.name.toLowerCase().includes(shoppingSearchQuery.toLowerCase())
                : item.name.includes(shoppingSearchQuery);
        });
    }, [shoppingList, shoppingSearchQuery]);

    const onListCount = useMemo(
        () => shoppingList.filter(isOnShoppingList).length,
        [shoppingList],
    );

    const buyCount = useMemo(() => shoppingBuyCount(shoppingList), [shoppingList]);

    const toastRef = useRef<ReturnType<typeof createToastController> | null>(null);
    if (!toastRef.current) {
        toastRef.current = createToastController(state => {
            setShowMessage(state !== null);
            if (state) setMessage(state.text);
            setUndoIds(state ? state.undoIds : null);
            undoIdsRef.current = state ? state.undoIds : null;
        });
    }
    const toast = toastRef.current;
    useEffect(() => () => toast.dismiss(), [toast]);

    const showToast = (text: string, idsForUndo?: string[]) => {
        toast.show(text, idsForUndo ?? null, idsForUndo ? UNDO_TOAST_MS : INFO_TOAST_MS);
    };

    const noteShoppingResult = (res: { code?: string }) => {
        if (res.code === 'version_conflict') {
            showToast(t('shopping.versionConflict'));
        }
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

    // Unit options exactly as the <UnitSelect> shows them; an untouched form has unit ''
    // and the select displays the first option, so that is the unit we must persist.
    const newItemKind = preferredUnitForIngredient(
        ingredients.find(i => i.name.toLowerCase() === newShoppingItem.name.toLowerCase()) || {
            default_unit: newShoppingItem.unit,
        },
        measurementSystem
    ).kind;
    const addLockRef = useRef(false);

    const handleAddShoppingItem = () => {
        if (!newShoppingItem.name.trim()) return;
        // Synchronous lock: a double click / Enter+click must not submit twice.
        if (addLockRef.current) return;
        addLockRef.current = true;
        window.setTimeout(() => { addLockRef.current = false; }, 600);
        const unit = resolveSelectedUnit(
            newShoppingItem.unit,
            unitSelectOptions(newItemKind, measurementSystem, true),
        );
        const draft = { ...newShoppingItem, name: newShoppingItem.name.trim(), unit };
        const plan = planShoppingAdd(shoppingList, draft);
        if (plan.action === 'merge') {
            void updateShoppingListItem({ ...plan.existing, quantity: plan.quantity, unit: plan.unit }).then(noteShoppingResult);
        } else {
            addShoppingListItem(draft);
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
        // Keep the "empty list" message away while this check-off is pending.
        setInFlightIds(prev => [...prev, id]);
        try {
            // Show the Undo toast the moment the user checks the item (8s starts now);
            // the network result only updates its text, never restarts the timer.
            if (updatedItem.checked) {
                showToast(t('shopping.itemAddedToPantry', { name: item.name }), [id]);
            }
            const res = await updateShoppingListItem(updatedItem);
            if (res.code === 'version_conflict') {
                noteShoppingResult(res);
                return;
            }
            if (!res.success) {
                if (updatedItem.checked) toast.dismiss();
                return;
            }
            applyCheckedLocally(id, updatedItem.checked);
            if (shoppingSearchQuery) setShoppingSearchQuery('');
            if (updatedItem.checked) {
                // One step: checking off also adds the item to the pantry (with Undo).
                const syncPromise = syncShoppingItemsToPantry([{ id }]);
                pendingSyncRef.current = syncPromise;
                const syncRes = await syncPromise;
                const syncedIds = syncRes.success && syncRes.data
                    ? syncRes.data.synced.map(i => i.id)
                    : [];
                if (syncedIds.length > 0) {
                    toast.update(t('shopping.itemAddedToPantry', { name: item.name }), syncedIds);
                } else {
                    toast.update(t('shopping.purchasedOnly'), null);
                }
            }
        } finally {
            setInFlightIds(prev => prev.filter(x => x !== id));
        }
    };

    const handleUncheckConfirm = async (alsoUnsync: boolean) => {
        const item = uncheckConfirmItem;
        setUncheckConfirmItem(null);
        if (!item) return;
        await handleUncheckConfirmFor(item, alsoUnsync);
    };

    const handleUncheckConfirmFor = async (item: ShoppingListItem, alsoUnsync: boolean) => {

        if (alsoUnsync) {
            await unsyncShoppingItemsFromPantry([item.id]);
        }
        const res = await updateShoppingListItem({ ...item, checked: false });
        if (res.code === 'version_conflict') {
            noteShoppingResult(res);
            return;
        }
        if (res.success) {
            applyCheckedLocally(item.id, false);
            if (shoppingSearchQuery) setShoppingSearchQuery('');
        }
    };

    const purchasedItems = useMemo(
        () => shoppingList.filter(item => item.checked && item.synced_to_pantry),
        [shoppingList],
    );

    const handleRestorePurchased = (item: ShoppingListItem) => {
        void handleUncheckConfirmFor(item, true);
    };

    const handleRemoveShoppingItem = async (id: string) => {
        if (!removeShoppingListItem) return;
        const res = await removeShoppingListItem(id);
        noteShoppingResult(res);
    };

    const uncheckedCount = useMemo(
        () => shoppingList.filter(item => !item.checked).length,
        [shoppingList]
    );

    const handleCompleteAll = async () => {
        const unchecked = shoppingList.filter(item => !item.checked);
        if (unchecked.length === 0 || isCompletingAll) return;

        setIsCompletingAll(true);
        setInFlightIds(prev => [...prev, ...unchecked.map(i => i.id)]);
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
                const syncRes = await syncShoppingItemsToPantry(unchecked.map(item => ({ id: item.id })));
                const syncedIds = syncRes.success && syncRes.data
                    ? syncRes.data.synced.map(i => i.id)
                    : [];
                if (syncedIds.length > 0) {
                    showToast(t('shopping.syncSuccess', { count: syncedIds.length }), syncedIds);
                } else {
                    showToast(t('shopping.allPurchased', { count: unchecked.length }));
                }
            } else {
                await fetchAllShoppingListItems({ force: true });
                const conflict = results.some(res => res.code === 'version_conflict');
                showToast(conflict ? t('shopping.versionConflict') : t('shopping.completeFailed'));
            }
        } finally {
            const done = new Set(unchecked.map(i => i.id));
            setInFlightIds(prev => prev.filter(x => !done.has(x)));
            setIsCompletingAll(false);
        }
    };

    const emptyState = shoppingEmptyState({
        visibleCount: filteredShoppingItems.length,
        onListCount,
        inFlightCount: inFlightIds.length,
        searchQuery: shoppingSearchQuery,
    });

    const handleUndoSync = async () => {
        if (!undoIds?.length) return;
        // Undo tapped while the check-off sync is still in flight: let it land first.
        if (pendingSyncRef.current) await pendingSyncRef.current;
        const ids = undoIdsRef.current ?? undoIds;
        toast.dismiss();
        if (!ids.length) return;
        setInFlightIds(prev => [...prev, ...ids]);
        try {
            const res = await unsyncShoppingItemsFromPantry(ids);
            if (res.success && res.data) {
                // Undo fully reverts the check-off so the item returns to Items to Buy.
                // (The server also removes / restores the pantry row it touched.)
                // Per-id ordering is serialised by the context's write queue, so ids can go in parallel.
                await Promise.all(
                    res.data.unsynced.map(restored => updateShoppingListItem({ ...restored, checked: false })),
                );
            }
        } finally {
            setInFlightIds(prev => prev.filter(x => !ids.includes(x)));
        }
    };

    return (
        <div className="flex flex-col w-full min-h-screen bg-linen">
            <AppHeader
                title={t('shopping.title')}
                onOpenMenu={onOpenMenu}
                subtitle={t('shopping.buyCount', { count: buyCount })}
            />
            <div className="flex-1 overflow-y-auto">
                <main className="flex-1 max-w-3xl mx-auto w-full px-6 lg:px-8 py-6">
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
                                        kind={newItemKind}
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
                        {emptyState !== 'list' ? (
                            <div className="p-6 text-center">
                                {emptyState === 'in_progress' ? (
                                    <p className="text-muted" role="status">{t('shopping.updating')}</p>
                                ) : (
                                    <p className="text-muted">
                                        {emptyState === 'no_match' ? t('shopping.noMatch') : t('shopping.empty')}
                                    </p>
                                )}
                                {emptyState === 'no_match' ? (
                                    <p className="text-muted text-sm mt-1">Try a different search term</p>
                                ) : emptyState === 'empty' && onAskAi ? (
                                    <button
                                        type="button"
                                        onClick={() => onAskAi(t('ai.emptyPrompts.pasteList'))}
                                        className="mt-3 text-sm font-medium text-herb hover:underline"
                                    >
                                        {t('shopping.emptyAskAi')}
                                    </button>
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
                                            <button
                                                onClick={() => void handleRemoveShoppingItem(item.id)}
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
                    {purchasedItems.length > 0 && (
                        <section className="mt-6 bg-surface rounded-xl shadow-sm border border-line overflow-hidden" data-testid="purchased-section">
                            <h2 className="p-4 border-b border-line bg-linen font-semibold text-ink">
                                {t('shopping.purchasedSection', { count: purchasedItems.length })}
                            </h2>
                            <ul className="divide-y divide-line">
                                {purchasedItems.map(item => (
                                    <li key={item.id} className="px-4 py-3 flex items-center gap-3">
                                        <span className="flex-1 min-w-0 text-muted capitalize">
                                            {item.name}
                                            <QuantityLabel
                                                className="text-sm ml-2"
                                                quantity={item.quantity}
                                                unit={item.unit}
                                                unitKind={item.unit_kind}
                                                baseUnit={item.base_unit}
                                                defaultDisplayUnit={item.default_display_unit}
                                                measurementSystem={measurementSystem}
                                            />
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRestorePurchased(item)}
                                            className="shrink-0 text-sm font-medium text-herb hover:underline"
                                        >
                                            {t('shopping.restore')}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </main>
            </div>

            {showMessage && (
                <div
                    role="status"
                    aria-live="polite"
                    data-testid="shopping-toast"
                    className="fixed bottom-6 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 p-3 bg-herb-deep text-white border border-line rounded-xl text-sm font-medium shadow-lg flex items-center justify-between gap-3"
                >
                    <span>{message}</span>
                    {undoIds && (
                        <button
                            type="button"
                            onClick={() => void handleUndoSync()}
                            className="shrink-0 underline font-semibold px-2 py-1"
                        >
                            {t('shopping.undo')}
                        </button>
                    )}
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
