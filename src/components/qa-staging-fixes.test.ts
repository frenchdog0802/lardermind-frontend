import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { qtyStillToBuy, shortagesNotOnList } from '../utils/shortages.ts';
import { approvalToolTitleKey } from '../utils/approvalTitle.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const locale = (l: string) => JSON.parse(read(`src/i18n/locales/${l}.json`)) as Record<string, unknown>;

function lookup(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);
}

function leafKeys(obj: unknown, prefix = ''): string[] {
  if (obj && typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      leafKeys(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

describe('landing page i18n', () => {
  const files = [
    'src/components/MarketingLanding.tsx',
    'src/components/PricingSection.tsx',
    'src/components/ProductPreviewMock.tsx',
  ];

  it('landing components translate through react-i18next', () => {
    for (const f of files) {
      const src = read(f);
      assert.match(src, /useTranslation/, `${f} must use useTranslation`);
    }
    const landing = read('src/components/MarketingLanding.tsx');
    assert.doesNotMatch(landing, /Sign up free|Just ask — LarderMind|How LarderMind works/);
  });

  it('every t() key used by the landing components exists in en and zh', () => {
    const used = new Set<string>();
    for (const f of files) {
      const src = read(f);
      for (const m of src.matchAll(/\bt\(\s*['`]([a-zA-Z0-9_.${}]+)['`]/g)) used.add(m[1]);
    }
    const expand = (key: string): string[] => {
      if (!key.includes('${')) return [key];
      if (key.startsWith('landing.faq.q')) return [1, 2, 3, 4].map((n) => `landing.faq.q${n}`);
      if (key.startsWith('landing.faq.a')) return [1, 2, 3, 4].map((n) => `landing.faq.a${n}`);
      if (key.includes('struggle.item')) {
        return [1, 2, 3, 4].flatMap((n) => [`landing.struggle.item${n}Title`, `landing.struggle.item${n}Body`]);
      }
      if (key.startsWith('preview.days.') || key.startsWith('preview.meals.')) {
        const base = key.slice(0, key.lastIndexOf('.') + 1);
        return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => `${base}${d}`);
      }
      if (key.startsWith('preview.items.')) {
        return ['chicken', 'lemons', 'garlic', 'pasta', 'salmon', 'tortillas', 'spinach'].map((d) => `preview.items.${d}`);
      }
      if (key.startsWith('preview.qty.')) return ['pack', 'two', 'bulb', 'pasta', 'bag'].map((d) => `preview.qty.${d}`);
      throw new Error(`unhandled dynamic key ${key}`);
    };
    for (const lang of ['en', 'zh']) {
      const json = locale(lang);
      for (const raw of used) {
        for (const key of expand(raw)) {
          assert.equal(typeof lookup(json, key), 'string', `${lang}: missing ${key}`);
          assert.ok((lookup(json, key) as string).trim());
        }
      }
    }
  });

  it('zh landing/pricing/preview have the same keys as en and are actually translated', () => {
    const en = locale('en');
    const zh = locale('zh');
    for (const ns of ['landing', 'pricing', 'preview']) {
      const enKeys = leafKeys(en[ns], ns).sort();
      const zhKeys = leafKeys(zh[ns], ns).sort();
      assert.deepEqual(zhKeys, enKeys, `${ns} key mismatch`);
    }
    assert.notEqual(lookup(zh, 'landing.hero.signUp'), lookup(en, 'landing.hero.signUp'));
    assert.notEqual(lookup(zh, 'landing.faq.a1'), lookup(en, 'landing.faq.a1'));
  });

  it('language switch persists across reloads (stored language is read on init)', () => {
    const src = read('src/i18n/index.ts');
    assert.match(src, /persistLanguage\(lng\)/);
    assert.match(src, /lng: resolveStoredLanguage\(\)/);
  });
});

describe('Open Pantry / Open Calendar chat cards', () => {
  it('are translated in en and zh and no longer hardcoded', () => {
    const src = read('src/components/AICookingAssistant.tsx');
    assert.doesNotMatch(src, />\s*Open Pantry\s*</);
    assert.doesNotMatch(src, /^\s*Open Calendar\s*$/m);
    assert.match(src, /t\('ai\.openPantry'\)/);
    assert.match(src, /t\('ai\.openCalendar'\)/);
    assert.notEqual(lookup(locale('zh'), 'ai.openPantry'), 'Open Pantry');
    assert.notEqual(lookup(locale('zh'), 'ai.openCalendar'), 'Open Calendar');
  });
});

describe('approval card labels', () => {
  it('getPreferences gets a human label instead of the generic fallback + raw tool name', () => {
    assert.equal(approvalToolTitleKey('getPreferences'), 'ai.approvalTool.getPreferences');
    assert.ok(lookup(locale('en'), 'ai.approvalTool.getPreferences'));
    assert.ok(lookup(locale('zh'), 'ai.approvalTool.getPreferences'));
  });
});

describe('checkout return', () => {
  it('captures session_id and verifies it server-side', () => {
    assert.match(read('src/App.tsx'), /params\.get\('session_id'\)/);
    const panel = read('src/components/SubscriptionPanel.tsx');
    assert.match(panel, /confirmCheckout\(checkoutSessionId\)/);
    assert.match(read('src/api/subscription.ts'), /\/api\/subscription\/confirm/);
  });
});

describe('shopping list quantities stay consistent with the calendar', () => {
  it('only the uncovered remainder is added (list 1 clove + need 4 -> add 3, not 4)', () => {
    const list = [{ name: 'Garlic', quantity: 1, unit: 'clove', checked: false }];
    assert.equal(qtyStillToBuy('garlic', 'clove', 4, list), 3);
    assert.equal(qtyStillToBuy('garlic', 'clove', 1, list), 0);
    assert.equal(qtyStillToBuy('cinnamon', 'g', 2, list), 2);
  });

  it('converts compatible units and ignores checked rows', () => {
    const list = [
      { name: 'Cinnamon', quantity: 0.5, unit: 'g', checked: true },
      { name: 'Flour', quantity: 0.5, unit: 'kg', checked: false },
    ];
    assert.equal(qtyStillToBuy('cinnamon', 'g', 2, list), 2);
    assert.equal(qtyStillToBuy('flour', 'g', 800, list), 300);
    const short = [{ name: 'Flour', needed: 800, available: 0, unit: 'g' }];
    assert.equal(shortagesNotOnList(short, list).length, 1);
    assert.equal(shortagesNotOnList(short, [{ name: 'Flour', quantity: 1, unit: 'kg', checked: false }]).length, 0);
  });

  it('Calendar add-to-shopping goes through qtyStillToBuy', () => {
    assert.match(read('src/components/Calendar.tsx'), /qtyStillToBuy\(/);
  });
});

describe('shopping list manual add + purchased restore', () => {
  const src = read('src/components/ShoppingList.tsx');

  it('persists the unit the picker displays (empty value -> first option)', () => {
    assert.match(src, /resolveSelectedUnit\(\s*newShoppingItem\.unit,\s*unitSelectOptions\(newItemKind, measurementSystem, true\)/);
  });

  it('guards against double submit synchronously', () => {
    assert.match(src, /if \(addLockRef\.current\) return;/);
  });

  it('keeps Undo toast and adds a purchased section with Restore', () => {
    assert.match(src, /shopping\.undo/);
    assert.match(src, /data-testid="purchased-section"/);
    assert.match(src, /shopping\.restore/);
  });
});

describe('pantry header count label', () => {
  it('is translated with plurals and spaced separator', () => {
    const src = read('src/components/PantryInventory.tsx');
    assert.ok(src.includes("t('pantry.itemCount', { count: filteredItems.length })"));
    assert.doesNotMatch(src, /item\{filteredItems/);
    const en = locale('en').pantry as Record<string, string>;
    const zh = locale('zh').pantry as Record<string, string>;
    assert.equal(en.itemCount_one, '{{count}} item');
    assert.equal(en.itemCount_other, '{{count}} items');
    assert.ok(zh.itemCount_other.includes('{{count}}'));
  });
  it('zh uses one calendar term in the UI', () => {
    assert.ok(!JSON.stringify(locale('zh')).includes('日曆'));
  });
});
