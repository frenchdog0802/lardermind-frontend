import { api } from './client';
import { Recipe } from './types';

export const recipeApi = {
    // List all recipes, optionally filtered by query
    list: (q?: string) => api.get<Recipe[]>(q ? `/api/recipe?q=${encodeURIComponent(q)}` : '/api/recipe'),

    // Get a single recipe by ID
    get: (id: string | number) => api.get<Recipe>(`/api/recipe/${id}`),

    // Create a new recipe
    create: (data: Partial<Recipe>) => api.post<Recipe>('/api/recipe', data),

    // Update an existing recipe by ID
    update: (id: string | number, data: Partial<Recipe>) => api.put<Recipe>(`/api/recipe/${id}`, data),

    // Delete a recipe by ID
    delete: (id: string | number) => api.delete<void>(`/api/recipe/${id}`),
};