import { api } from './client';
import { Folder } from './types';

export const folderApi = {
    // List all folders, optionally filtered by query
    list: (q?: string) => api.get<Folder[]>(q ? `/api/folder?q=${encodeURIComponent(q)}` : '/api/folder'),

    // Get a single folder by ID
    get: (id: string | number) => api.get<Folder>(`/api/folder/${id}`),

    // Create a new folder
    create: (data: Partial<Folder>) => api.post<Folder>('/api/folder', data),

    // Update an existing folder by ID
    update: (id: string | number, data: Partial<Folder>) => api.put<Folder>(`/api/folder/${id}`, data),

    // Delete a folder by ID
    delete: (id: string | number) => api.delete<void>(`/api/folder/${id}`),
};