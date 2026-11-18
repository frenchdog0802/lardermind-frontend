import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const src = readFileSync(join(root, 'src/components/GuestChatBox.tsx'), 'utf8');

describe('guest demo starts instantly', () => {
  it('does not mint a guest session on mount', () => {
    assert.match(src, /const \[minting, setMinting\] = useState\(false\)/);
    assert.doesNotMatch(src, /void ensureGuest\(\)/);
    assert.doesNotMatch(src, /createSession\(/);
  });

  it('mints lazily on first send and keeps the input enabled until then', () => {
    assert.match(src, /const token = await ensureGuestToken\(\)/);
    assert.match(src, /const busy = isTyping \|\| minting;/);
    assert.doesNotMatch(src, /minting \|\| !guestToken/);
  });
});
