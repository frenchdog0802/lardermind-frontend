import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectBrowserLanguage, isAppLanguage, matchSupportedLanguage } from './detect.ts';

describe('browser language detection', () => {
  it('maps regional tags to the supported language', () => {
    assert.equal(matchSupportedLanguage('fr-CA'), 'fr');
    assert.equal(matchSupportedLanguage('es_MX'), 'es');
    assert.equal(matchSupportedLanguage('de-AT'), 'de');
    assert.equal(matchSupportedLanguage('ja-JP'), 'ja');
    assert.equal(matchSupportedLanguage('zh-Hant-TW'), 'zh');
    assert.equal(matchSupportedLanguage('zh-CN'), 'zh');
    assert.equal(matchSupportedLanguage('it-IT'), undefined);
    assert.equal(matchSupportedLanguage(''), undefined);
    assert.equal(matchSupportedLanguage(undefined), undefined);
  });

  it('picks the first supported entry of navigator.languages', () => {
    assert.equal(detectBrowserLanguage(['it-IT', 'ja-JP', 'en-US']), 'ja');
    assert.equal(detectBrowserLanguage(['pt-BR', 'de', 'fr']), 'de');
  });

  it('defaults to en when nothing matches or the list is empty', () => {
    assert.equal(detectBrowserLanguage(['it', 'pt-BR']), 'en');
    assert.equal(detectBrowserLanguage([]), 'en');
  });

  it('validates stored values', () => {
    for (const ok of ['en', 'zh', 'es', 'fr', 'de', 'ja']) assert.ok(isAppLanguage(ok));
    for (const bad of ['zh-TW', 'it', '', null, undefined, 5]) assert.ok(!isAppLanguage(bad));
  });
});

describe('i18n wiring (source)', async () => {
  const { readFileSync } = await import('node:fs');
  const { dirname, join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.ts'), 'utf8');

  it('registers all six locales and respects a saved choice before auto-detecting', () => {
    for (const l of ['en', 'zh', 'es', 'fr', 'de', 'ja']) {
      assert.match(src, new RegExp(`${l}: \\{ translation: ${l} \\}`));
    }
    assert.match(src, /isAppLanguage\(stored\)[\s\S]*return stored[\s\S]*return detectBrowserLanguage\(\)/);
  });

  it('syncs <html lang> for every language', () => {
    for (const tag of ["'es'", "'fr'", "'de'", "'ja'", "'zh-TW'"]) {
      assert.ok(src.includes(`htmlLang: ${tag}`), tag);
    }
  });
});
