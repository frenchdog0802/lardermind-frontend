import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('api client BASE_URL', () => {
  it('uses a direct import.meta.env.VITE_API_BASE_URL so Vite can inline it', () => {
    const src = readFileSync(join(root, 'src/api/client.ts'), 'utf8');
    assert.match(
      src,
      /import\.meta\.env\.VITE_API_BASE_URL/,
      'BASE_URL must reference import.meta.env.VITE_API_BASE_URL directly',
    );
    assert.doesNotMatch(
      src,
      /meta\.env\?\.VITE_API_BASE_URL/,
      'do not read VITE_API_BASE_URL via a meta variable (breaks Vite replace)',
    );
  });
});
