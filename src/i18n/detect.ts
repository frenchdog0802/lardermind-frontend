// Pure language helpers (no i18next / JSON imports) so they can be unit-tested directly.
export type AppLanguage = 'en' | 'zh' | 'es' | 'fr' | 'de' | 'ja';

export const APP_LANGUAGE_CODES: readonly AppLanguage[] = ['en', 'zh', 'es', 'fr', 'de', 'ja'];

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (APP_LANGUAGE_CODES as readonly string[]).includes(value);
}

/** Map one BCP-47 tag (e.g. 'fr-CA', 'zh-Hant-TW') to a supported app language, or undefined. */
export function matchSupportedLanguage(tag: string | null | undefined): AppLanguage | undefined {
  const primary = (tag ?? '').trim().toLowerCase().split(/[-_]/)[0];
  return isAppLanguage(primary) ? primary : undefined;
}

/** Best supported language from a navigator.languages-style list (first match wins), default 'en'. */
export function detectBrowserLanguage(
  languages: ReadonlyArray<string> | undefined = typeof navigator !== 'undefined'
    ? navigator.languages?.length
      ? navigator.languages
      : [navigator.language]
    : undefined,
): AppLanguage {
  for (const tag of languages ?? []) {
    const match = matchSupportedLanguage(tag);
    if (match) return match;
  }
  return 'en';
}

