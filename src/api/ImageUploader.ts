// src/api/imageUploadApi.ts
import { api } from "./client";
import type { ApiResponse } from "./types";

type UploadedImage = { image_url: string; public_id: string };

/** Shared client handles the JWT, Accept header, FormData boundary and non-JSON error bodies
 *  (it throws an Error with the status for those). Here we only normalise HTTP failures. */
function assertOk<T>(res: ApiResponse<T>, fallback: string): ApiResponse<T> {
    const status = res.statusCode ?? 200;
    if (status >= 400 || res.success === false) {
        return { ...res, success: false, message: res.message || `${fallback} (${status})` };
    }
    return res;
}

export const ImageUploadApi = {
    upload: async (file: File): Promise<ApiResponse<UploadedImage>> => {
        const formData = new FormData();
        formData.append("image", file);
        return assertOk(await api.postForm<UploadedImage>("/api/upload/image", formData), "Upload failed");
    },
    delete: async (publicId: string): Promise<ApiResponse<null>> => {
        return assertOk(
            await api.delete<null>(`/api/upload/image/${encodeURIComponent(publicId)}`),
            "Delete failed",
        );
    },
};
