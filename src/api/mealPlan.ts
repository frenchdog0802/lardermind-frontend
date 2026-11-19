import { api } from './client';
import { ConfirmMealPlanResult, MealPlan, MealPlanAvailabilityResult } from './types';

export const mealPlanApi = {
    list: (query?: string) =>
        api.get<MealPlan[] | { mealPlans?: MealPlan[] }>(
            query ? `/api/meal-plan?query=${encodeURIComponent(query)}` : '/api/meal-plan'
        ),

    get: (id: string | number) => api.get<MealPlan>(`/api/meal-plan/${id}`),

    pendingConfirm: () =>
        api.get<{ mealPlans?: MealPlan[] } | MealPlan[]>('/api/meal-plan/pending-confirm'),

    availability: (from: string, to: string, init?: { signal?: AbortSignal }) =>
        api.get<MealPlanAvailabilityResult>(
            `/api/meal-plan/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
            init,
        ),

    create: (data: Partial<MealPlan>) => api.post<MealPlan | { mealPlan?: MealPlan }>('/api/meal-plan', data),

    confirm: (id: string | number) =>
        api.post<ConfirmMealPlanResult>(`/api/meal-plan/${id}/confirm`),

    skip: (id: string | number) =>
        api.post<{ mealPlan: MealPlan; alreadySkipped: boolean }>(`/api/meal-plan/${id}/skip`),

    update: (id: string | number, data: Partial<MealPlan>) =>
        api.put<MealPlan>(`/api/meal-plan/${id}`, data),

    delete: (id: string | number) => api.delete<void>(`/api/meal-plan/${id}`),
};
