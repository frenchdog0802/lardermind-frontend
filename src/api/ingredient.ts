import { api } from './client';
import { IngredientEntry } from './types';

export const ingredientApi = {
    // List all recipes, optionally filtered by query
    list: (query?: string) => api.get<IngredientEntry[]>(query ? `/api/ingredient?query=${encodeURIComponent(query)}` : '/api/ingredient'),

    // Get a single recipe by ID
    get: (id: string | number) => api.get<IngredientEntry>(`/api/ingredient/${id}`),

    // Create a new recipe
    create: (data: Partial<IngredientEntry>) => api.post<IngredientEntry>('/api/ingredient', data),

    // Update an existing recipe by ID
    update: (id: string | number, data: Partial<IngredientEntry>) => api.put<IngredientEntry>(`/api/ingredient/${id}`, data),

    // Delete a recipe by ID
    delete: (id: string | number) => api.delete<void>(`/api/ingredient/${id}`),
};