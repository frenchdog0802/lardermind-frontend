import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function readComposerSource(): string {
  return readFileSync(join(root, 'src/components/AICookingAssistant.tsx'), 'utf8');
}

function composerWrapperClassName(src: string): string {
  const match = src.match(
    /const composerField = \(?\s*<div className="([^"]*)"/,
  );
  assert.ok(match, 'expected composerField wrapper div with className');
  return match[1];
}

/** Slice the first `@layer base { ... }` block (brace-balanced). */
function extractLayerBaseBlock(css: string): string {
  const start = css.search(/@layer\s+base\s*\{/);
  assert.ok(start >= 0, 'expected an @layer base block in index.css');
  let i = css.indexOf('{', start) + 1;
  let depth = 1;
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') depth -= 1;
    i += 1;
  }
  return css.slice(start, i);
}

describe('web chat composer double-border regression', () => {
  it('composer textarea clears its own border (chrome stays on wrapper)', () => {
    const src = readComposerSource();
    const textareaMatch = src.match(/<textarea\b[\s\S]*?className="([^"]*)"/);
    assert.ok(textareaMatch, 'expected a textarea with className in AICookingAssistant');
    assert.match(
      textareaMatch[1],
      /\bborder-0\b/,
      'composer textarea must include border-0 so global form border does not draw a square frame',
    );
  });

  it('global form control border lives in @layer base so utilities can override', () => {
    const css = readFileSync(join(root, 'src/index.css'), 'utf8');
    assert.match(
      css,
      /@layer\s+base\s*\{[\s\S]*?\btextarea\b[\s\S]*?border:\s*1px\s+solid\s+var\(--line\)/,
      'textarea default border must be inside @layer base',
    );
  });
});

describe('web chat composer focus-ring regression', () => {
  it('composer wrapper does not add a focus-within ring (no second frame on click)', () => {
    const wrapperClass = composerWrapperClassName(readComposerSource());
    assert.doesNotMatch(
      wrapperClass,
      /focus-within:ring-/,
      'composer wrapper must not use focus-within:ring-* (extra frame on focus)',
    );
  });
});

describe('web chat composer focus-outline-flash regression', () => {
  it('global *:focus-visible outline lives in @layer base so utilities can override', () => {
    const css = readFileSync(join(root, 'src/index.css'), 'utf8');
    const baseBlock = extractLayerBaseBlock(css);
    assert.match(
      baseBlock,
      /\*:focus-visible\s*\{[\s\S]*?outline:/,
      '*:focus-visible outline must be inside @layer base (unlayered would beat outline-none)',
    );
    const focusVisibleRules = css.match(/\*:focus-visible\s*\{/g) || [];
    assert.equal(
      focusVisibleRules.length,
      1,
      'exactly one *:focus-visible rule (no leftover unlayered copy)',
    );
  });

  it('composer textarea opts out of focus-visible outline', () => {
    const src = readComposerSource();
    const textareaMatch = src.match(/<textarea\b[\s\S]*?className="([^"]*)"/);
    assert.ok(textareaMatch, 'expected a textarea with className in AICookingAssistant');
    assert.match(
      textareaMatch[1],
      /\bfocus-visible:outline-none\b/,
      'composer textarea must include focus-visible:outline-none to suppress dark outline flash',
    );
  });
});

describe('web chat message timestamp regression', () => {
  it('does not render a message <time> or formatTimestamp helper', () => {
    const src = readComposerSource();
    assert.doesNotMatch(src, /<time\b/, 'message rows must not render a <time> element');
    assert.doesNotMatch(
      src,
      /\bformatTimestamp\b/,
      'formatTimestamp helper must be removed (no visible clock on messages)',
    );
  });
});
