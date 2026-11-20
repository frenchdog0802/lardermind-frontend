import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ja from './locales/ja.json';

import {
  detectBrowserLanguage,
  isAppLanguage,
  matchSupportedLanguage,
  type AppLanguage,
} from './detect';

export const LANGUAGE_STORAGE_KEY = 'appLanguage';
export {
  isAppLanguage,
  matchSupportedLanguage,
  detectBrowserLanguage,
  type AppLanguage,
};

/** Saved choice wins; otherwise the best supported browser language; otherwise 'en'. */
export function resolveStoredLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isAppLanguage(stored)) {
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return detectBrowserLanguage();
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
  { code: 'es', short: 'ES', native: 'Español', htmlLang: 'es' },
  { code: 'fr', short: 'FR', native: 'Français', htmlLang: 'fr' },
  { code: 'de', short: 'DE', native: 'Deutsch', htmlLang: 'de' },
  { code: 'ja', short: '日本語', native: '日本語', htmlLang: 'ja' },
  { code: 'zh', short: '中文', native: '中文', htmlLang: 'zh-TW' },
];

export function applyHtmlLang(lng: string = i18n.language) {
  if (typeof document === 'undefined') return;
  const match = SUPPORTED_LANGUAGES.find((l) => l.code === matchSupportedLanguage(lng));
  document.documentElement.lang = match?.htmlLang ?? 'en';
}

/** Single entry point for switching language: persists, switches i18n, updates <html lang>. */
export async function changeAppLanguage(lng: AppLanguage) {
  persistLanguage(lng);
  await i18n.changeLanguage(lng);
}

const DATE_LOCALES: Record<AppLanguage, string> = {
  en: 'en-US',
  zh: 'zh-TW',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
};

export function dateLocale(lng: string = i18n.language): string {
  return DATE_LOCALES[matchSupportedLanguage(lng) ?? 'en'];
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    ja: { translation: ja },
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
