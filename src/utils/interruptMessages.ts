/**
 * Approval ("interrupt") chat rows only render an Approve / Reject card for the
 * newest one while an approval is actually pending. Every other interrupt row is
 * history: showing its text ("I need your approval...") with no card looks like a
 * broken approval, so it is rewritten as a plain resolved note.
 */
export type InterruptLikeMessage = {
    id: string;
    type?: string;
    content: string;
};

export function settleStaleInterrupts<T extends InterruptLikeMessage>(
    messages: readonly T[],
    hasPending: boolean,
    resolvedText: string,
): T[] {
    let lastInterruptId: string | undefined;
    if (hasPending) {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i]!.type === 'interrupt') {
                lastInterruptId = messages[i]!.id;
                break;
            }
        }
    }
    return messages.map((m) =>
        m.type === 'interrupt' && m.id !== lastInterruptId
            ? { ...m, type: 'text', content: resolvedText }
            : m,
    );
}

/** True when a pending approval has nothing to attach its card to. */
export function needsFallbackApprovalCard(
    messages: readonly InterruptLikeMessage[],
    hasPending: boolean,
): boolean {
    return hasPending && !messages.some((m) => m.type === 'interrupt');
}
