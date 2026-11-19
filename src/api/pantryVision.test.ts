import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('pantryVision API client', () => {
  it('appends multipart field name image for recognize', () => {
    const src = readFileSync(join(root, 'src/api/pantryVision.ts'), 'utf8');
    assert.match(src, /form\.append\(\s*['"]image['"]/);
    assert.match(src, /\/api\/pantry-vision\/recognize/);
    assert.match(src, /\/api\/pantry-vision\/apply/);
  });

  it('uses api.postForm so Content-Type boundary is not forced', () => {
    const src = readFileSync(join(root, 'src/api/pantryVision.ts'), 'utf8');
    assert.match(src, /api\.postForm/);
    const client = readFileSync(join(root, 'src/api/client.ts'), 'utf8');
    assert.match(client, /postForm/);
    assert.match(client, /instanceof FormData/);
  });
});
