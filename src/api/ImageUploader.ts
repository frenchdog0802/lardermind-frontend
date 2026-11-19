// src/api/imageUploadApi.ts
import type { ApiResponse } from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export const ImageUploadApi = {
    upload: async (file: File): Promise<ApiResponse<{ image_url: string, public_id: string }>> => {
        const stored = localStorage.getItem("jwt");
        let token = "";
        if (stored) {
            try {
                token = JSON.parse(stored);
            } catch {
                token = stored;
            }
        }

        const formData = new FormData();
        formData.append("image", file);

        const res = await fetch(`${BASE_URL}/api/upload/image`, {
            method: "POST",
            body: formData,
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });

        const json = (await res.json()) as ApiResponse<{ image_url: string, public_id: string }>;
        return json;
    },
    delete: async (publicId: string): Promise<ApiResponse<null>> => {
        const stored = localStorage.getItem("jwt");
        let token = "";
        if (stored) {
            try {
                token = JSON.parse(stored);
            } catch {
                token = stored;
            }
        }

        const res = await fetch(`${BASE_URL}/api/upload/image/${encodeURIComponent(publicId)}`, {
            method: "DELETE",
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        const json = (await res.json()) as ApiResponse<null>;
        return json;
    },
};
