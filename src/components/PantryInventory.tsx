import {
  memo,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type ChangeEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  MinusIcon,
  TrashIcon,
  SearchIcon,
  PackageIcon,
  CameraIcon,
} from 'lucide-react';
import { usePantry } from '../contexts/pantryContext';
import { IngredientEntry, PantryItem } from '../api/types';
import {
  pantryVisionApi,
  type RecognizedPantryItem,
} from '../api/pantryVision';
import useSearchIngredients from '../hooks/useSearchIngredient';
import { NumberInput } from './NumberInput';
import { UnitSelect, QuantityLabel, preferredUnitForIngredient } from './UnitSelect';
import { AppHeader } from './AppHeader';
import { PantryImageReviewModal } from './PantryImageReviewModal';
import { isAscii } from '../utils/isAscii';
import { UNDO_TOAST_MS, shoppingBuyCount } from '../utils/shoppingListState';
import { describeVisionFailure, VISION_ACCEPT } from '../utils/pantryVisionPicker';
import {
  mergeQuantities,
  resolveSelectedUnit,
  stepForUnit,
  unitSelectOptions,
  type MeasurementSystem,
} from '../utils/units';

interface PantryInventoryProps {
    onBack: () => void;
    onOpenMenu?: () => void;
    onAskAi?: (prompt: string) => void;
}

interface PantryRowProps {
    item: PantryItem;
    isEditing: boolean;
    /** Only meaningful for the row being edited (so other rows keep stable props). */
    draft: string;
    measurementSystem: MeasurementSystem;
    onUpdateQuantity: (itemName: string, amount: number) => void;
    onStartEdit: (item: PantryItem) => void;
    onDraftChange: (value: string) => void;
    onCommitEdit: (item: PantryItem) => void;
    onCancelEdit: () => void;
    onRemove: (itemName: string) => void;
}

/** Memoised: a search keystroke or a toast only re-renders rows whose props changed. */
const PantryRow = memo(function PantryRow({
    item,
    isEditing,
    draft,
    measurementSystem,
    onUpdateQuantity,
    onStartEdit,
    onDraftChange,
    onCommitEdit,
    onCancelEdit,
    onRemove,
}: PantryRowProps) {
    const { t } = useTranslation();
    const planned = item.item_planned || 0;
    const toBuy = item.item_to_buy || 0;
    const isOut = (item.quantity || 0) <= 0;

    return (
        <div className={`flex items-center gap-3 px-4 py-3.5 ${isOut ? 'bg-amber-50/40' : ''}`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                    <h3 className="text-base font-semibold text-ink truncate capitalize">{item.name}</h3>
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
                    onClick={() => onUpdateQuantity(item.name, -stepForUnit(item.unit))}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-sage/50 hover:bg-sage text-ink transition-colors"
                    aria-label={`Decrease ${item.name}`}
                >
                    <MinusIcon size={16} />
                </button>
                <div className="min-w-[3.25rem] text-center">
                    {isEditing ? (
                        <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="any"
                            autoFocus
                            value={draft}
                            onChange={e => onDraftChange(e.target.value)}
                            onBlur={() => onCommitEdit(item)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') onCommitEdit(item);
                                if (e.key === 'Escape') onCancelEdit();
                            }}
                            aria-label={t('pantry.editQuantity', { name: item.name })}
                            className="w-20 rounded-lg border border-line px-2 py-1 text-center text-base font-bold tabular-nums"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => onStartEdit(item)}
                            title={t('pantry.editQuantity', { name: item.name })}
                            aria-label={t('pantry.editQuantity', { name: item.name })}
                            className={`text-lg font-bold tabular-nums leading-none ${isOut ? 'text-amber-800' : 'text-ink'}`}
                        >
                            <QuantityLabel
                                quantity={item.quantity}
                                unit={item.unit}
                                unitKind={item.unit_kind}
                                baseUnit={item.base_unit}
                                defaultDisplayUnit={item.default_display_unit}
                                measurementSystem={measurementSystem}
                            />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => onUpdateQuantity(item.name, stepForUnit(item.unit))}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-herb hover:bg-herb-deep text-white transition-colors"
                    aria-label={`Increase ${item.name}`}
                >
                    <PlusIcon size={16} />
                </button>
            </div>

            <button
                onClick={() => onRemove(item.name)}
                className="p-2 rounded-lg text-muted hover:text-herb hover:bg-sage/50 transition-colors shrink-0"
                aria-label={`Remove ${item.name}`}
            >
                <TrashIcon size={16} />
            </button>
        </div>
    );
});

export function PantryInventory({ onBack: _onBack, onOpenMenu, onAskAi }: PantryInventoryProps) {
    const { t } = useTranslation();
    const {
        pantryItems: oriPantryItems,
        updatePantryItem,
        addPantryItem,
        removePantryItem,
        ingredients,
        fetchAllPantryItems,
        fetchAllIngredients,
        fetchAllShoppingListItems,
        shoppingList,
        userSettings,
    } = usePantry();

    const measurementSystem = (userSettings.measurement_unit === 'imperial' ? 'imperial' : 'metric') as MeasurementSystem;
    // The context list is the single source of truth (no local copy to keep in sync).
    const pantryItems = oriPantryItems;
    const pantryItemsRef = useRef(pantryItems);
    pantryItemsRef.current = pantryItems;
    const [searchQuery, setSearchQuery] = useState('');
    const [newItem, setNewItem] = useState({
        name: '',
        quantity: 1,
        unit: '',
    });
    // Once the user picks a unit, catalog defaults must never overwrite it.
    const unitTouchedRef = useRef(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [recognizing, setRecognizing] = useState(false);
    const [recognizeError, setRecognizeError] = useState<string | null>(null);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewItems, setReviewItems] = useState<RecognizedPantryItem[]>([]);
    const [reviewPreviewUrl, setReviewPreviewUrl] = useState<string | null>(null);
    const [reviewEmptyMessage, setReviewEmptyMessage] = useState<string | null>(null);
    const visionInputRef = useRef<HTMLInputElement>(null);
    const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingDraft, setEditingDraft] = useState('');

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
                    unit: unitTouchedRef.current
                        ? prev.unit
                        : preferredUnitForIngredient(match, measurementSystem).unit,
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
            const isEnglish = isAscii(name);
            const matchesSearch = isEnglish
                ? name.toLowerCase().includes(searchQuery.toLowerCase())
                : name.includes(searchQuery);
            return matchesSearch;
        });
    }, [pantryItems, searchQuery]);

    useEffect(() => {
        fetchAllPantryItems();
        void fetchAllIngredients(null);
        void fetchAllShoppingListItems();
    }, [fetchAllPantryItems, fetchAllIngredients, fetchAllShoppingListItems]);


    // ?????????????????
    const handleSelectIngredient = (ingredient: IngredientEntry) => {
        setNewItem(prev => ({
            name: ingredient.name,
            quantity: 1,
            unit: unitTouchedRef.current
                ? prev.unit
                : preferredUnitForIngredient(ingredient, measurementSystem).unit,
        }));
        setShowDropdown(false);
        setSelectedIndex(-1);
    };

    const showToast = useCallback((text: string, undo?: () => void) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ text, undo });
        toastTimerRef.current = setTimeout(() => setToast(null), undo ? UNDO_TOAST_MS : 3500);
    }, []);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, []);

    // Stable row handlers (they read the latest list/draft through refs) so memoised rows
    // are not re-rendered by unrelated state such as the search box.
    const editingDraftRef = useRef(editingDraft);
    editingDraftRef.current = editingDraft;

    const startEditingQuantity = useCallback((item: PantryItem) => {
        setEditingId(item.id);
        setEditingDraft(String(item.quantity));
    }, []);

    const cancelEditingQuantity = useCallback(() => setEditingId(null), []);

    const commitEditingQuantity = useCallback((item: PantryItem) => {
        const draft = editingDraftRef.current;
        const value = Number(draft);
        setEditingId(null);
        if (draft.trim() === '' || !Number.isFinite(value) || value < 0) return;
        if (value !== item.quantity) {
            updatePantryItem({ ...item, quantity: value });
        }
    }, [updatePantryItem]);

    const handleUpdateQuantity = useCallback((itemName: string, amount: number) => {
        const item = pantryItemsRef.current.find(item => item.name === itemName);
        if (item) {
            const newQuantity = Number((item.quantity + amount).toFixed(10));
            updatePantryItem({ ...item, quantity: Math.max(0, newQuantity) });
        }
    }, [updatePantryItem]);

    const handleRemoveItem = useCallback((itemName: string) => {
        const item = pantryItemsRef.current.find(item => item.name === itemName);
        if (item && removePantryItem) {
            removePantryItem(item.id);
            const { id: _removedId, ...restoreFields } = item;
            showToast(t('pantry.removed', { name: item.name }), () => {
                addPantryItem(restoreFields);
                setToast(null);
            });
        }
    }, [removePantryItem, addPantryItem, showToast, t]);

    const handleAddItem = () => {
        if (!newItem.name.trim()) return;
        // Save exactly the unit the select shows. The select offers every app unit,
        // so a chosen unit (g, kg, ml...) is never coerced to the catalog's count unit.
        const displayedUnit = resolveSelectedUnit(
            newItem.unit,
            unitSelectOptions(undefined, measurementSystem, false),
        );
        // Check if item already exists
        const existingItem = pantryItems.find(item => item.name.toLowerCase() === newItem.name.toLowerCase());
        if (existingItem) {
            // Merge into the existing row when the units are compatible.
            const merged = mergeQuantities(
                existingItem.quantity,
                existingItem.unit,
                newItem.quantity,
                displayedUnit || existingItem.unit,
            );
            if (merged !== null) {
                updatePantryItem({ ...existingItem, quantity: merged });
                showToast(
                    t('pantry.merged', {
                        name: existingItem.name,
                        quantity: merged,
                        unit: existingItem.unit,
                    }),
                );
            } else {
                updatePantryItem({
                    ...existingItem,
                    quantity: newItem.quantity,
                    unit: displayedUnit || existingItem.unit,
                });
                showToast(t('pantry.replaced', { name: existingItem.name }));
            }
        } else {
            // Add new item
            addPantryItem({ ...newItem, unit: displayedUnit });
        }
        // Reset form
        unitTouchedRef.current = false;
        setNewItem({
            name: '',
            quantity: 1,
            unit: '',
        });
        setIsAddingItem(false);
    };

    const handleCancelAddItem = () => {
        unitTouchedRef.current = false;
        setNewItem({
            name: '',
            quantity: 1,
            unit: '',
        });
        setShowDropdown(false);
        setSelectedIndex(-1);
        setIsAddingItem(false);
    };

    // Same source as the Chat home chip: rows still on the shopping list.
    const needsBuyingCount = useMemo(() => shoppingBuyCount(shoppingList), [shoppingList]);

    const closeReviewModal = useCallback(() => {
        setReviewOpen(false);
        setReviewItems([]);
        setReviewEmptyMessage(null);
        if (reviewPreviewUrl) {
            URL.revokeObjectURL(reviewPreviewUrl);
            setReviewPreviewUrl(null);
        }
    }, [reviewPreviewUrl]);

    const openVisionPicker = useCallback(() => {
        const input = visionInputRef.current;
        if (!input) {
            setRecognizeError(t('pantryVision.pickerUnavailable'));
            return;
        }
        setRecognizeError(null);
        try {
            input.click();
        } catch {
            setRecognizeError(t('pantryVision.pickerUnavailable'));
        }
    }, [t]);

    const handleVisionFileChange = useCallback(
        async (e: ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;

            const previewUrl = URL.createObjectURL(file);
            setRecognizing(true);
            setRecognizeError(null);
            try {
                const res = await pantryVisionApi.recognize(file);
                if (!res.success || !res.data) {
                    URL.revokeObjectURL(previewUrl);
                    // Pro / quota / sign-in gates come back as a failed response: say so.
                    const failure = describeVisionFailure(res);
                    setRecognizeError(
                        failure === 'upgrade'
                            ? t('pantryVision.upgradeRequired')
                            : failure === 'sign_in'
                              ? t('pantryVision.signInRequired')
                              : res.message || t('pantryVision.errorRecognize'),
                    );
                    return;
                }
                setReviewItems(res.data.items ?? []);
                setReviewEmptyMessage(res.data.message ?? null);
                setReviewPreviewUrl(previewUrl);
                setReviewOpen(true);
            } catch {
                URL.revokeObjectURL(previewUrl);
                setRecognizeError(t('pantryVision.errorRecognize'));
            } finally {
                setRecognizing(false);
            }
        },
        [t],
    );

    return (
        <div className="flex flex-col w-full min-h-screen bg-linen">
            <AppHeader
                title={t('pantry.title')}
                onOpenMenu={onOpenMenu}
                subtitle={
                    <>
                        {filteredItems.length} item{filteredItems.length === 1 ? '' : 's'}
                        {` · ${t('shopping.buyCount', { count: needsBuyingCount })}`}
                    </>
                }
            />
            <div className="flex-1 overflow-y-auto">
                <main className="flex-1 max-w-3xl mx-auto w-full px-6 lg:px-8 py-6">
                    {/* Visually hidden, NOT display:none: some browsers refuse to open the
                        picker for a display:none file input. The Scan button is a label bound
                        to this input, so it works even if the click() call is blocked. */}
                    <input
                        id="pantry-vision-input"
                        ref={visionInputRef}
                        type="file"
                        accept={VISION_ACCEPT}
                        className="sr-only"
                        tabIndex={-1}
                        data-testid="pantry-vision-input"
                        onChange={(e) => {
                            void handleVisionFileChange(e);
                        }}
                    />
                    {toast && (
                        <div
                            role="status"
                            className="mb-4 p-3 bg-sage/50 border border-line rounded-xl text-herb-deep text-sm font-medium flex items-center justify-between gap-3"
                        >
                            <span>{toast.text}</span>
                            {toast.undo && (
                                <button
                                    type="button"
                                    onClick={toast.undo}
                                    className="shrink-0 underline font-semibold"
                                >
                                    {t('pantry.undo')}
                                </button>
                            )}
                        </div>
                    )}
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

                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <label
                            htmlFor="pantry-vision-input"
                            role="button"
                            tabIndex={recognizing ? -1 : 0}
                            aria-disabled={recognizing}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openVisionPicker();
                                }
                            }}
                            onClick={(e) => {
                                // A native label click already opens the picker; only guard
                                // the in-flight state and surface a visible error if no input.
                                if (recognizing) {
                                    e.preventDefault();
                                    return;
                                }
                                if (!visionInputRef.current) {
                                    e.preventDefault();
                                    setRecognizeError(t('pantryVision.pickerUnavailable'));
                                }
                            }}
                            className={`inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink hover:bg-sage/40 cursor-pointer ${recognizing ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            <CameraIcon size={16} />
                            {recognizing
                                ? t('common.loading')
                                : t('pantryVision.scan')}
                        </label>
                        {recognizeError ? (
                            <p className="text-sm text-red-700" role="alert">
                                {recognizeError}
                            </p>
                        ) : null}
                    </div>

                    <PantryImageReviewModal
                        open={reviewOpen}
                        items={reviewItems}
                        imagePreviewUrl={reviewPreviewUrl}
                        emptyMessage={reviewEmptyMessage}
                        onClose={closeReviewModal}
                        onApplied={() => {
                            void fetchAllPantryItems({ force: true });
                        }}
                    />

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
                                        value={newItem.unit}
                                        onChange={unit => {
                                            unitTouchedRef.current = true;
                                            setNewItem({ ...newItem, unit });
                                        }}
                                        measurementSystem={measurementSystem}
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
                            ) : onAskAi ? (
                                <button
                                    type="button"
                                    onClick={() => onAskAi(t('ai.emptyPrompts.pasteList'))}
                                    className="mt-4 text-sm font-medium text-herb hover:underline"
                                >
                                    {t('pantry.emptyAskAi')}
                                </button>
                            ) : null}
                        </div>
                    ) : (
                        <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden divide-y divide-line">
                            {filteredItems.map(item => (
                                <PantryRow
                                    key={item.id || item.name}
                                    item={item}
                                    isEditing={editingId === item.id}
                                    draft={editingId === item.id ? editingDraft : ''}
                                    measurementSystem={measurementSystem}
                                    onUpdateQuantity={handleUpdateQuantity}
                                    onStartEdit={startEditingQuantity}
                                    onDraftChange={setEditingDraft}
                                    onCommitEdit={commitEditingQuantity}
                                    onCancelEdit={cancelEditingQuantity}
                                    onRemove={handleRemoveItem}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}