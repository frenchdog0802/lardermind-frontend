/**
 * `image/*` (no `capture` attribute) makes iOS / Android offer both "Take Photo" and the photo library.
 * Camera photos can arrive as HEIC or very large, so every pick goes through prepareVisionImage().
 */
export const VISION_ACCEPT = 'image/*';

/** MIME types the vision endpoint accepts (HEIC is not supported server-side). */
export const VISION_ALLOWED_MIME: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];
/** Server limit is 8 MB; re-encode anything above this so phone photos never hit a 413. */
export const VISION_MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const VISION_SERVER_MAX_BYTES = 8 * 1024 * 1024;

export function needsVisionConversion(file: { type: string; size: number }): boolean {
    return !VISION_ALLOWED_MIME.includes((file.type || '').toLowerCase()) || file.size > VISION_MAX_UPLOAD_BYTES;
}

/**
 * Returns a file the backend accepts (jpeg/png/webp, <= 8 MB): HEIC / unknown types and large photos
 * are re-encoded to a resized JPEG in the browser. Throws when that is impossible.
 */
export async function prepareVisionImage(file: File): Promise<File> {
    if (!needsVisionConversion(file)) return file;
    const alreadyAcceptable =
        VISION_ALLOWED_MIME.includes((file.type || '').toLowerCase()) && file.size <= VISION_SERVER_MAX_BYTES;
    try {
        const { compressImage } = await import('./imageHelper');
        const out = await compressImage(file, 1.5, 'image/jpeg');
        const name = file.name.replace(/\.[^.]+$/, '') || 'photo';
        return new File([out], `${name}.jpg`, { type: 'image/jpeg' });
    } catch (error) {
        if (alreadyAcceptable) return file;
        throw error;
    }
}

export type VisionFailureKind = 'upgrade' | 'sign_in' | 'other';

type VisionResponseLike = {
    success?: boolean;
    message?: string | null;
    code?: string | null;
    statusCode?: number;
};

/**
 * Classify a failed /api/pantry-vision/recognize response so the UI can show a
 * clear upgrade / sign-in message instead of failing silently.
 * 403 = image quota / plan gate, 401 = signed out or guest account.
 */
export function describeVisionFailure(res: VisionResponseLike): VisionFailureKind {
    const status = res.statusCode;
    const text = `${res.message ?? ''} ${res.code ?? ''}`.toLowerCase();
    if (status === 403 || /quota|upgrade|pro\b|plan/.test(text)) return 'upgrade';
    if (status === 401 || /sign up|sign in|unauthor|guest/.test(text)) return 'sign_in';
    return 'other';
}
