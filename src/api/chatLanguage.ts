/**
 * Language tag sent to the chat backend so the assistant answers in the app's language even for
 * short replies ("A", "ok"). The server accepts an optional `language` field: `zh*` means Traditional
 * Chinese, `en*` means English, anything else is ignored. Returns undefined when the language is unknown
 * so the field stays absent (older servers and the server-side guess keep working).
 */
export function chatLanguageTag(lng: string | null | undefined): 'zh-TW' | 'en' | undefined {
    const value = (lng ?? '').trim().toLowerCase();
    if (value.startsWith('zh')) return 'zh-TW';
    if (value.startsWith('en')) return 'en';
    return undefined;
}
