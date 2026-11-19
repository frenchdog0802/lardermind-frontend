import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('header language switcher', () => {
  it('reuses the existing persistence + i18n mechanism and updates <html lang>', () => {
    const i18n = read('src/i18n/index.ts');
    assert.match(i18n, /export async function changeAppLanguage[\s\S]*persistLanguage\(lng\)[\s\S]*i18n\.changeLanguage\(lng\)/);
    assert.match(i18n, /document\.documentElement\.lang\s*=/);
    assert.match(i18n, /i18n\.on\('languageChanged'/);
  });

  it('lists every supported locale by native name', () => {
    const i18n = read('src/i18n/index.ts');
    assert.match(i18n, /native: 'English'/);
    assert.match(i18n, /native: '中文'/);
    for (const n of ['Español', 'Français', 'Deutsch', '日本語']) {
      assert.ok(i18n.includes(`native: '${n}'`), n);
    }
    const sw = read('src/components/LanguageSwitcher.tsx');
    assert.match(sw, /SUPPORTED_LANGUAGES\.map/);
  });

  it('is accessible: aria-label, menu semantics, Escape closes and restores focus', () => {
    const sw = read('src/components/LanguageSwitcher.tsx');
    assert.match(sw, /aria-label=\{t\('common\.language'\)\}/);
    assert.match(sw, /aria-haspopup="menu"/);
    assert.match(sw, /aria-expanded=\{open\}/);
    assert.match(sw, /role="menuitemradio"/);
    assert.match(sw, /e\.key === 'Escape'[\s\S]*close\(true\)/);
    assert.match(sw, /buttonRef\.current\?\.focus\(\)/);
  });

  it('appears in the logged-in AppHeader and the marketing landing nav', () => {
    assert.match(read('src/components/AppHeader.tsx'), /<LanguageSwitcher \/>/);
    assert.match(read('src/components/MarketingLanding.tsx'), /<LanguageSwitcher \/>/);
  });

  it('Settings and pantry context share the same switching path', () => {
    assert.match(read('src/components/Settings.tsx'), /await changeAppLanguage\(lng\)/);
    assert.match(read('src/contexts/pantryContext.tsx'), /i18n\.on\('languageChanged'/);
  });

  it('has the common.language string in every locale', () => {
    for (const f of ['en', 'zh', 'es', 'fr', 'de', 'ja']) {
      const j = JSON.parse(read(`src/i18n/locales/${f}.json`));
      assert.ok(j.common.language, `${f} common.language`);
    }
  });
});
