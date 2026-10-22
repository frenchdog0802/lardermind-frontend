/// <reference types="vite/client" />
import type { ApiResponse } from './types';

function readApiBaseUrl(): string {
    const meta = import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } };
    const value = meta.env?.VITE_API_BASE_URL;
    return typeof value === 'string' ? value : '';
}

const BASE_URL = readApiBaseUrl();

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const stored = localStorage.getItem('jwt');
    let token = '';
    if (stored) {
        try {
            token = JSON.parse(stored);
        } catch {
            token = stored;
        }
    }

    const { headers: extraHeaders, ...rest } = options;
    const headers = new Headers(extraHeaders);
    if (rest.body !== undefined && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json; charset=UTF-8');
    }
    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
    }
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(`${BASE_URL}${path}`, {
        ...rest,
        headers,
    });
    let responseBody: ApiResponse<T>;
    try {
        responseBody = (await res.json()) as ApiResponse<T>;
    } catch {
        // Fallback for non-JSON responses
        const text = await res.text().catch(() => '');
        throw new Error(`API ${options.method ?? 'GET'} ${path} failed: ${res.status} ${text}`);
    }
    return { ...responseBody, statusCode: res.status };
}
export default request;

type ApiCallInit = Pick<RequestInit, 'headers' | 'signal'>;

export const api = {
    get: <T>(path: string, init?: ApiCallInit) =>
        request<T>(path, { method: 'GET', ...init }),
    post: <T>(path: string, body?: unknown, init?: ApiCallInit) =>
        request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}), ...init }),
    put: <T>(path: string, body?: unknown, init?: ApiCallInit) =>
        request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}), ...init }),
    patch: <T>(path: string, body?: unknown, init?: ApiCallInit) =>
        request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}), ...init }),
    delete: <T>(path: string, init?: ApiCallInit) =>
        request<T>(path, { method: 'DELETE', ...init }),
};
