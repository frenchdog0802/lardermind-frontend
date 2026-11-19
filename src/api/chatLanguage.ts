/**
 * Language tag sent to the chat backend so the assistant answers in the app's language even for
 * short replies ("A", "ok"). The server accepts an optional `language` field (en, zh, es, fr, de, ja;
 * locale tags are matched by prefix). `zh*` is sent as Traditional Chinese 'zh-TW'. Returns undefined
 * when the language is unsupported so the field stays absent (older servers and the server-side guess
 * keep working).
 */
export type ChatLanguageTag = 'zh-TW' | 'en' | 'es' | 'fr' | 'de' | 'ja';

export function chatLanguageTag(lng: string | null | undefined): ChatLanguageTag | undefined {
    const primary = (lng ?? '').trim().toLowerCase().split(/[-_]/)[0];
    if (primary === 'zh') return 'zh-TW';
    if (primary === 'en' || primary === 'es' || primary === 'fr' || primary === 'de' || primary === 'ja') {
        return primary;
    }
    return undefined;
}
