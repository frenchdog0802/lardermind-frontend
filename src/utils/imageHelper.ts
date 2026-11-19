// src/api/imageHelper.ts
import imageCompression from "browser-image-compression";

export async function compressImage(file: File, maxSizeMB = 0.5) {
    const options = {
        maxSizeMB,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
    };

    try {
        const compressed = await imageCompression(file, options);
        return compressed;
    } catch (error) {
        console.error("Image compression error:", error);
        throw error;
    }
}
