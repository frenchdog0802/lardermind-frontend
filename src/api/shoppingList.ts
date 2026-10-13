import { api } from './client';
import {
    ShoppingListItem,
    SyncToPantryItemInput,
    SyncToPantryResult,
    UnsyncFromPantryResult,
} from './types';

type ShoppingListItemDto = {
    id?: string;
    name?: string;
    quantity?: number;
    unit?: string;
    checked?: boolean;
    synced_to_pantry?: boolean;
    ingredient_id?: string;
    details?: Partial<ShoppingListItem> & Record<string, unknown>;
};

function fromDto(dto: ShoppingListItemDto): ShoppingListItem {
    const details = dto.details ?? {};
    const synced =
        dto.synced_to_pantry ??
        (details.synced_to_pantry as boolean | undefined) ??
        false;
    return {
        id: String(dto.id ?? details.id ?? ''),
        name: String(dto.name ?? details.name ?? ''),
        quantity: Number(dto.quantity ?? details.quantity ?? 0),
        unit: String(dto.unit ?? details.unit ?? ''),
        checked: Boolean(dto.checked ?? details.checked ?? false),
        synced_to_pantry: Boolean(synced),
        ingredient_id:
            dto.ingredient_id != null
                ? String(dto.ingredient_id)
                : details.ingredient_id != null
                  ? String(details.ingredient_id)
                  : undefined,
    };
}

/** Backend Create/Update DTOs expect { name, details: { quantity, unit, checked } }. */
function toRequestPayload(data: Partial<ShoppingListItem>) {
    return {
        name: data.name,
        details: {
            quantity: data.quantity,
            unit: data.unit,
            checked: data.checked ?? false,
        },
    };
}

export function parseShoppingListItems(data: unknown): ShoppingListItem[] {
    if (Array.isArray(data)) {
        return data.map(fromDto);
    }
    if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
        return (data as { items: ShoppingListItemDto[] }).items.map(fromDto);
    }
    return [];
}

export function parseShoppingListItem(data: unknown): ShoppingListItem | null {
    if (!data || typeof data !== 'object') {
        return null;
    }
    const obj = data as Record<string, unknown>;
    if (obj.item && typeof obj.item === 'object') {
        return fromDto(obj.item as ShoppingListItemDto);
    }
    return fromDto(obj as ShoppingListItemDto);
}

function parseSyncResult(data: unknown): SyncToPantryResult {
    const root = (data && typeof data === 'object' ? data : {}) as {
        synced?: unknown;
        skipped?: unknown;
    };
    return {
        synced: parseShoppingListItems(root.synced ?? []),
        skipped: Array.isArray(root.skipped)
            ? (root.skipped as Array<{ id: string; reason: string }>)
            : [],
    };
}

function parseUnsyncResult(data: unknown): UnsyncFromPantryResult {
    const root = (data && typeof data === 'object' ? data : {}) as {
        unsynced?: unknown;
        skipped?: unknown;
    };
    return {
        unsynced: parseShoppingListItems(root.unsynced ?? []),
        skipped: Array.isArray(root.skipped)
            ? (root.skipped as Array<{ id: string; reason: string }>)
            : [],
    };
}

export const shoppingListApi = {
    list: (query?: string) =>
        api.get<unknown>(query ? `/api/shopping-list?query=${encodeURIComponent(query)}` : '/api/shopping-list'),

    get: (id: string | number) => api.get<unknown>(`/api/shopping-list/${id}`),

    create: (data: Partial<ShoppingListItem>) =>
        api.post<unknown>('/api/shopping-list', toRequestPayload(data)),

    update: (id: string | number, data: Partial<ShoppingListItem>) =>
        api.put<unknown>(`/api/shopping-list/${id}`, toRequestPayload(data)),

    delete: (id: string | number) => api.delete<void>(`/api/shopping-list/${id}`),

    syncToPantry: (items: SyncToPantryItemInput[]) =>
        api.post<unknown>('/api/shopping-list/sync-to-pantry', { items }),

    unsyncFromPantry: (itemIds: string[]) =>
        api.post<unknown>('/api/shopping-list/unsync-from-pantry', {
            item_ids: itemIds,
        }),
};

export { parseSyncResult, parseUnsyncResult };
