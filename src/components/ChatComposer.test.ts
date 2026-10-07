import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function readChatComposerSource(): string {
  return readFileSync(join(root, 'src/components/ChatComposer.tsx'), 'utf8');
}

describe('ChatComposer chrome ownership', () => {
  it('does not use focus-within ring or border utilities for chrome', () => {
    const src = readChatComposerSource();
    assert.doesNotMatch(
      src,
      /focus-within:ring-/,
      'wrapper must not use focus-within:ring-*',
    );
    assert.doesNotMatch(
      src,
      /focus-within:border-/,
      'wrapper must not use focus-within:border-* (use focused state instead)',
    );
  });

  it('drives wrapper border from focused state (line idle, herb focused)', () => {
    const src = readChatComposerSource();
    assert.match(src, /useState\(false\)/, 'expected focused boolean state');
    assert.match(src, /setFocused\(true\)/, 'onFocus must set focused');
    assert.match(src, /setFocused\(false\)/, 'onBlur must clear focused');
    assert.match(
      src,
      /focused\s*\?\s*['"]border-herb['"]\s*:\s*['"]border-line['"]/,
      'wrapper border class must switch herb vs line from focused',
    );
  });

  it('bare textarea has inline chrome reset so global CSS cannot paint a frame', () => {
    const src = readChatComposerSource();
    assert.match(src, /border:\s*['"]none['"]/, 'inline border none required');
    assert.match(src, /outline:\s*['"]none['"]/, 'inline outline none required');
    assert.match(src, /boxShadow:\s*['"]none['"]/, 'inline boxShadow none required');
    const textareaMatch = src.match(/<textarea\b[\s\S]*?className="([^"]*)"/);
    assert.ok(textareaMatch, 'expected textarea className');
    assert.match(textareaMatch[1], /\bborder-0\b/);
    assert.match(textareaMatch[1], /\bfocus-visible:outline-none\b/);
  });
});
