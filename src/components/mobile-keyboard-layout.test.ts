import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readVisualViewportHeight } from '../hooks/useVisualViewportHeight.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('readVisualViewportHeight', () => {
  it('rounds a valid height', () => {
    assert.equal(readVisualViewportHeight({ height: 401.6 }), 402);
  });
  it('returns null for missing / invalid viewports', () => {
    assert.equal(readVisualViewportHeight(null), null);
    assert.equal(readVisualViewportHeight(undefined), null);
    assert.equal(readVisualViewportHeight({ height: 0 }), null);
    assert.equal(readVisualViewportHeight({ height: Number.NaN }), null);
  });
});

describe('chat screen keyboard layout', () => {
  const src = read('src/components/AICookingAssistant.tsx');
  it('sizes the root to the visual viewport so the composer stays above the keyboard', () => {
    assert.match(src, /useVisualViewportHeight\(\)/);
    assert.match(src, /height: `\$\{viewportHeight\}px`/);
  });
  it('docks the composer at the bottom on mobile in the empty stage', () => {
    assert.match(src, /isMobile && \(\s*<div className="shrink-0/);
    assert.match(src, /!isMobile && <div className="mt-8 w-full">\{composerField\}/);
  });
  it('viewport meta enables safe-area insets', () => {
    assert.match(read('index.html'), /viewport-fit=cover/);
  });
});
