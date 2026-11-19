import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('landing guest chat locale', () => {
  it('GuestChatBox supports fixedLanguage override via getFixedT', () => {
    const src = readFileSync(join(root, 'src/components/GuestChatBox.tsx'), 'utf8');
    assert.match(src, /fixedLanguage\?:/);
    assert.match(src, /getFixedT\(fixedLanguage\)/);
  });

  it('MarketingLanding lets the embedded GuestChatBox follow the app language', () => {
    const src = readFileSync(join(root, 'src/components/MarketingLanding.tsx'), 'utf8');
    assert.doesNotMatch(src, /fixedLanguage=/);
  });
});
