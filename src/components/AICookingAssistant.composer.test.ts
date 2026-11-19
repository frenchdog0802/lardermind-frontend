import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function readAssistantSource(): string {
  return readFileSync(join(root, 'src/components/AICookingAssistant.tsx'), 'utf8');
}

describe('web chat composer structural wire-up', () => {
  it('uses ChatComposer instead of inline chrome wrapper', () => {
    const src = readAssistantSource();
    assert.match(src, /from ['"]\.\/ChatComposer['"]/);
    assert.match(src, /<ChatComposer\b/);
    assert.doesNotMatch(
      src,
      /focus-within:(?:ring|border)-/,
      'assistant must not keep focus-within composer chrome',
    );
    assert.doesNotMatch(
      src,
      /const composerField = \(?\s*<div className="/,
      'inline composer wrapper div should be replaced by ChatComposer',
    );
  });
});

describe('web chat message timestamp regression', () => {
  it('does not render a message <time> or formatTimestamp helper', () => {
    const src = readAssistantSource();
    assert.doesNotMatch(src, /<time\b/, 'message rows must not render a <time> element');
    assert.doesNotMatch(
      src,
      /\bformatTimestamp\b/,
      'formatTimestamp helper must be removed (no visible clock on messages)',
    );
  });
});
