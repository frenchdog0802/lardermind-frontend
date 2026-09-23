import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('web chat composer double-border regression', () => {
  it('composer textarea clears its own border (chrome stays on wrapper)', () => {
    const src = readFileSync(
      join(root, 'src/components/AICookingAssistant.tsx'),
      'utf8',
    );
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
