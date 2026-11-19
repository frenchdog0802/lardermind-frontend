/** MIME types the vision endpoint accepts (HEIC is not supported server-side). */
export const VISION_ACCEPT = 'image/jpeg,image/png,image/webp';

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
