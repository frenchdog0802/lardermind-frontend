import { api } from './client';
import type { ApiResponse, PantryItem } from './types';

export type RecognizedPantryItem = {
    category: string;
    name: string;
    quantity: number;
    unit: string;
};

export type RecognizeResult = {
    items: RecognizedPantryItem[];
    message?: string | null;
};

export type ApplyResult = {
    items: PantryItem[];
    added: number;
    merged: number;
};

export const pantryVisionApi = {
    recognize: async (file: File): Promise<ApiResponse<RecognizeResult>> => {
        const form = new FormData();
        form.append('image', file);
        return api.postForm<RecognizeResult>('/api/pantry-vision/recognize', form);
    },

    apply: (
        items: RecognizedPantryItem[],
    ): Promise<ApiResponse<ApplyResult>> =>
        api.post<ApplyResult>('/api/pantry-vision/apply', { items }),
};
