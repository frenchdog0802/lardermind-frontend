import { api } from './client';

type CookingHistoryItem = {
    id: string;
};

export const historyApi = {
    list: () => api.get<CookingHistoryItem[]>('/api/history'),
    add: (h: Omit<CookingHistoryItem, 'id'>) => api.post<CookingHistoryItem>('/api/history', h),
};
