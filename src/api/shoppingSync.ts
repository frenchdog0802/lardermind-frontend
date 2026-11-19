import type { ShoppingListItem } from './types';

const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{1,128}$/;

const MUTABLE_FIELDS = ['name', 'quantity', 'unit', 'checked', 'ingredient_id'] as const;
type MutableField = (typeof MUTABLE_FIELDS)[number];

export function readShoppingVersion(source: {
    version?: unknown;
    details?: { version?: unknown } | null;
}): number | undefined {
    const details = source.details;
    const raw = source.version ?? details?.version;
    if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0) return raw;
    if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) return Number(raw.trim());
    return undefined;
}

export function createIdempotencyKey(): string {
    const uuid = globalThis.crypto?.randomUUID?.();
    const key = uuid ?? `key-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    return key.slice(0, 128);
}

export function idempotencyHeaders(key: string = createIdempotencyKey()): Record<string, string> {
    if (!IDEMPOTENCY_KEY.test(key)) {
        throw new Error('Idempotency-Key must be 1–128 characters of [A-Za-z0-9._:-]');
    }
    return { 'Idempotency-Key': key };
}

/** Create body. Version is assigned by the server. */
export function shoppingCreateBody(data: Partial<ShoppingListItem>) {
    return {
        name: data.name,
        details: {
            quantity: data.quantity,
            unit: data.unit,
            checked: data.checked ?? false,
        },
    };
}

/** Update body. Top-level `version` is the expected version when the client has one. */
export function shoppingUpdateBody(data: Partial<ShoppingListItem>) {
    return {
        ...shoppingCreateBody(data),
        ...(typeof data.version === 'number' ? { version: data.version } : {}),
    };
}

export function shoppingDeletePath(id: string | number, version?: number): string {
    const base = `/api/shopping-list/${id}`;
    if (typeof version !== 'number') return base;
    return `${base}?version=${encodeURIComponent(String(version))}`;
}

export type ShoppingWriteMerge =
    | { action: 'send'; item: ShoppingListItem }
    | { action: 'keep'; item: ShoppingListItem }
    | { action: 'conflict'; item: ShoppingListItem };

function fieldValue(item: ShoppingListItem, field: MutableField): ShoppingListItem[MutableField] {
    return item[field];
}

function withFields(
    current: ShoppingListItem,
    intended: ShoppingListItem,
    fields: readonly MutableField[],
): ShoppingListItem {
    const next: ShoppingListItem = { ...current };
    for (const field of fields) {
        switch (field) {
            case 'name':
                next.name = intended.name;
                break;
            case 'quantity':
                next.quantity = intended.quantity;
                break;
            case 'unit':
                next.unit = intended.unit;
                break;
            case 'checked':
                next.checked = intended.checked;
                break;
            case 'ingredient_id':
                next.ingredient_id = intended.ingredient_id;
                break;
            default:
                break;
        }
    }
    return next;
}

function sameMutableFields(left: ShoppingListItem, right: ShoppingListItem): boolean {
    return MUTABLE_FIELDS.every((field) => fieldValue(left, field) === fieldValue(right, field));
}

/**
 * Apply a local edit onto the latest row.
 * Same-field edits that disagree become a conflict so the caller can show the server row.
 * Edits the server already matches are kept without another write.
 * Edits to fields the server did not change are reapplied and sent with the current version.
 */
export function mergeShoppingWrite(
    previous: ShoppingListItem | undefined,
    intended: ShoppingListItem,
    current: ShoppingListItem,
): ShoppingWriteMerge {
    if (!previous) {
        return { action: 'send', item: { ...intended, version: current.version ?? intended.version } };
    }

    const changed = MUTABLE_FIELDS.filter(
        (field) => fieldValue(previous, field) !== fieldValue(intended, field),
    );
    if (changed.length === 0) {
        return { action: 'keep', item: current };
    }

    const conflictFields = changed.filter(
        (field) =>
            fieldValue(previous, field) !== fieldValue(current, field) &&
            fieldValue(current, field) !== fieldValue(intended, field),
    );
    if (conflictFields.length > 0) {
        return { action: 'conflict', item: current };
    }

    const next = withFields(current, intended, changed);
    if (sameMutableFields(next, current)) {
        return { action: 'keep', item: current };
    }
    return { action: 'send', item: next };
}

type ShoppingListItemDto = {
    id?: string;
    name?: string;
    quantity?: number;
    unit?: string;
    checked?: boolean;
    version?: number | string;
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
        version: readShoppingVersion({ version: dto.version, details }),
        synced_to_pantry: Boolean(synced),
        ingredient_id:
            dto.ingredient_id != null
                ? String(dto.ingredient_id)
                : details.ingredient_id != null
                  ? String(details.ingredient_id)
                  : undefined,
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

export function readShoppingVersionConflict(response: {
    success: boolean;
    code?: string;
    data?: unknown;
}): ShoppingListItem | null {
    if (response.success || response.code !== 'version_conflict') return null;
    if (!response.data || typeof response.data !== 'object') return null;
    const current = (response.data as { current?: unknown }).current;
    if (!current || typeof current !== 'object') return null;
    const item = parseShoppingListItem(current);
    return item?.id ? item : null;
}
