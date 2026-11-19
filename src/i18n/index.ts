import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';

export const LANGUAGE_STORAGE_KEY = 'appLanguage';
export type AppLanguage = 'en' | 'zh';

export function resolveStoredLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'zh' || stored === 'en') {
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return 'en';
}

export function persistLanguage(lng: AppLanguage) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  } catch {
    // ignore storage errors
  }
}

export const SUPPORTED_LANGUAGES: ReadonlyArray<{
  code: AppLanguage;
  /** Compact label shown on the switcher button. */
  short: string;
  /** Native name shown in the menu (never translated). */
  native: string;
  /** BCP-47 tag written to <html lang>. */
  htmlLang: string;
}> = [
  { code: 'en', short: 'EN', native: 'English', htmlLang: 'en' },
  { code: 'zh', short: '中文', native: '中文', htmlLang: 'zh-TW' },
];

export function applyHtmlLang(lng: string = i18n.language) {
  if (typeof document === 'undefined') return;
  const match = SUPPORTED_LANGUAGES.find((l) => lng?.startsWith(l.code));
  document.documentElement.lang = match?.htmlLang ?? 'en';
}

/** Single entry point for switching language: persists, switches i18n, updates <html lang>. */
export async function changeAppLanguage(lng: AppLanguage) {
  persistLanguage(lng);
  await i18n.changeLanguage(lng);
}

export function dateLocale(lng: string = i18n.language): string {
  return lng?.startsWith('zh') ? 'zh-TW' : 'en-US';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: resolveStoredLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => applyHtmlLang(lng));
applyHtmlLang(resolveStoredLanguage());

export default i18n;
