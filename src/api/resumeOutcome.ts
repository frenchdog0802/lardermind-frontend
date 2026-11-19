/** Classify POST /api/chat/resume without importing the Vite API client. */

export type ChatResumeCode =
    | 'interrupt_mismatch'
    | 'resume_in_progress'
    | 'tool_args_invalid'
    | 'target_missing'
    | 'no_pending_action';

export type ChatResumeOutcome =
    | { kind: 'expired' }
    | { kind: 'interrupt' }
    | { kind: 'ok' }
    | { kind: ChatResumeCode }
    | { kind: 'failed' };

export type ChatResumeResponseLike = {
    success: boolean;
    code?: string;
    message?: string;
    data?: {
        type?: string;
        data?: Record<string, unknown> | null;
    } | null;
};

const RESUME_CODES: readonly ChatResumeCode[] = [
    'interrupt_mismatch',
    'resume_in_progress',
    'tool_args_invalid',
    'target_missing',
    'no_pending_action',
];

function isResumeCode(code: string | undefined): code is ChatResumeCode {
    return RESUME_CODES.includes(code as ChatResumeCode);
}

export function readInterruptId(data: unknown): string | undefined {
    if (!data || typeof data !== 'object') return undefined;
    const id = (data as { interruptId?: unknown }).interruptId;
    return typeof id === 'string' && id.trim() ? id.trim() : undefined;
}

export function classifyChatResume(response: ChatResumeResponseLike): ChatResumeOutcome {
    if (!response.success) {
        if (isResumeCode(response.code)) {
            return { kind: response.code };
        }
        return { kind: 'failed' };
    }

    const payload = response.data?.data;
    if (payload && payload.expired === true) {
        return { kind: 'expired' };
    }
    if (response.data?.type === 'interrupt') {
        return { kind: 'interrupt' };
    }
    return { kind: 'ok' };
}
