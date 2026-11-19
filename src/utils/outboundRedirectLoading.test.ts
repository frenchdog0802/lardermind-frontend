import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { shouldClearOutboundRedirectLoading } from './outboundRedirectLoading.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('outbound redirect loading reset', () => {
  it('clears only on bfcache restore (pageshow persisted)', () => {
    assert.equal(shouldClearOutboundRedirectLoading({ persisted: true }), true);
    assert.equal(shouldClearOutboundRedirectLoading({ persisted: false }), false);
  });

  it('UpgradeButtons resets loadingPlan on bfcache pageshow', () => {
    const src = readFileSync(join(root, 'src/components/UpgradeButtons.tsx'), 'utf8');
    assert.match(src, /shouldClearOutboundRedirectLoading/);
    assert.match(src, /addEventListener\(\s*['"]pageshow['"]/);
    assert.match(src, /setLoadingPlan\(null\)/);
  });

  it('SubscriptionPanel resets portalLoading on bfcache pageshow', () => {
    const src = readFileSync(join(root, 'src/components/SubscriptionPanel.tsx'), 'utf8');
    assert.match(src, /shouldClearOutboundRedirectLoading/);
    assert.match(src, /addEventListener\(\s*['"]pageshow['"]/);
    assert.match(src, /setPortalLoading\(false\)/);
  });
});
