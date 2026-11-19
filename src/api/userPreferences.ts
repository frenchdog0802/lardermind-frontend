import { api } from './client';
import type { UserPreferences } from './types';

type UserPreferencesResponse = {
    preferences?: UserPreferences;
};

function unwrap(data: unknown): UserPreferences | null {
    if (!data || typeof data !== 'object') {
        return null;
    }
    const obj = data as UserPreferencesResponse & UserPreferences;
    const prefs = obj.preferences ?? obj;
    if (!prefs || typeof prefs !== 'object') {
        return null;
    }
    return {
        id: prefs.id,
        allergies: prefs.allergies ?? [],
        dislikes: prefs.dislikes ?? [],
        likes: prefs.likes ?? [],
        dietaryRestrictions: prefs.dietaryRestrictions ?? [],
        householdNotes: prefs.householdNotes ?? '',
        measurementUnit: prefs.measurementUnit === 'imperial' ? 'imperial' : 'metric',
        notes: prefs.notes ?? '',
    };
}

export const userPreferencesApi = {
    get: async (): Promise<UserPreferences | null> => {
        const response = await api.get<unknown>('/api/user-preferences');
        if (!response.success || !response.data) {
            return null;
        }
        return unwrap(response.data);
    },

    update: async (data: Partial<UserPreferences>): Promise<UserPreferences | null> => {
        const response = await api.put<unknown>('/api/user-preferences', data);
        if (!response.success || !response.data) {
            return null;
        }
        return unwrap(response.data);
    },
};
