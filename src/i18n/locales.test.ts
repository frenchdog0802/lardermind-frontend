import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'locales');
const LOCALES = ['zh', 'es', 'fr', 'de', 'ja'];
const load = (name: string) => JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8'));

// i18next plural suffixes differ per language (ja/zh only have _other), so compare plural families.
const PLURAL = /_(zero|one|two|few|many|other)$/;

/** Flatten to leaf paths. Arrays are compared by length; ai.demoResponses is keyed by the translated
 *  demo prompts, so its children are compared by count (and keys must equal demoSuggestedPrompts). */
function leaves(node: unknown, path = ''): Array<[string, unknown]> {
  if (path === 'ai.demoResponses') return [[`${path}#count`, Object.keys(node as object).length]];
  if (Array.isArray(node)) {
    return [[`${path}[]`, node.length], ...node.flatMap((v, i) => leaves(v, `${path}[${i}]`))];
  }
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [[path, node]];
}

const keySet = (data: unknown) => new Set(leaves(data).map(([p]) => p.replace(PLURAL, '_plural')));
const en = load('en');

describe('locale files', () => {
  for (const name of LOCALES) {
    describe(name, () => {
      const data = load(name);

      it('has exactly the same key tree as en.json', () => {
        const a = keySet(en);
        const b = keySet(data);
        const missing = [...a].filter((k) => !b.has(k));
        const extra = [...b].filter((k) => !a.has(k));
        assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
      });

      it('has no empty values', () => {
        const empty = leaves(data)
          .filter(([, v]) => typeof v === 'string' && v.trim() === '')
          .map(([p]) => p);
        assert.deepEqual(empty, []);
      });

      it('keeps every {{placeholder}} of the English string', () => {
        const flat = (d: unknown) => new Map(leaves(d).filter(([, v]) => typeof v === 'string') as Array<[string, string]>);
        const e = flat(en);
        const l = flat(data);
        const bad: string[] = [];
        for (const [k, v] of e) {
          if (!l.has(k)) continue; // plural-suffix variants are covered by the key-tree test
          const vars = (x: string) => (x.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort().join(',');
          if (vars(v) !== vars(l.get(k)!)) bad.push(k);
        }
        assert.deepEqual(bad, []);
      });

      it('keys ai.demoResponses by its translated demo prompts', () => {
        assert.deepEqual(Object.keys(data.ai.demoResponses), data.ai.demoSuggestedPrompts);
      });

      it('keeps the product name', () => {
        assert.match(data.auth.forgotSubtitle, /LarderMind/);
      });

      it('has the photo-upload strings', () => {
        for (const p of [data.ai.snapFridge, data.ai.composerHint, data.pantryVision.attach, data.pantryVision.attachTooltip, data.landing.how.photoLine]) {
          assert.ok(typeof p === 'string' && p.trim());
        }
      });
    });
  }

  it('en.json itself has no empty values', () => {
    assert.deepEqual(leaves(en).filter(([, v]) => typeof v === 'string' && !(v as string).trim()), []);
  });
});
