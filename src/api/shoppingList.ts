import { api } from './client';
import {
    idempotencyHeaders,
    parseShoppingListItems,
    shoppingCreateBody,
    shoppingDeletePath,
    shoppingUpdateBody,
} from './shoppingSync';
import {
    ShoppingListItem,
    SyncToPantryItemInput,
    SyncToPantryResult,
    UnsyncFromPantryResult,
} from './types';

export { parseShoppingListItem, parseShoppingListItems, readShoppingVersionConflict } from './shoppingSync';

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

    create: (data: Partial<ShoppingListItem>, idempotencyKey?: string) =>
        api.post<unknown>('/api/shopping-list', shoppingCreateBody(data), {
            headers: idempotencyHeaders(idempotencyKey),
        }),

    update: (id: string | number, data: Partial<ShoppingListItem>, idempotencyKey?: string) =>
        api.put<unknown>(`/api/shopping-list/${id}`, shoppingUpdateBody(data), {
            headers: idempotencyHeaders(idempotencyKey),
        }),

    delete: (id: string | number, version?: number, idempotencyKey?: string) =>
        api.delete<null>(shoppingDeletePath(id, version), {
            headers: idempotencyHeaders(idempotencyKey),
        }),

    syncToPantry: (items: SyncToPantryItemInput[]) =>
        api.post<unknown>('/api/shopping-list/sync-to-pantry', { items }),

    unsyncFromPantry: (itemIds: string[]) =>
        api.post<unknown>('/api/shopping-list/unsync-from-pantry', {
            item_ids: itemIds,
        }),
};

export { parseSyncResult, parseUnsyncResult };
