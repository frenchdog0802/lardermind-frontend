import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('logged-out landing makes no authenticated calls', () => {
  it('PantryProvider only loads preferences when authenticated', () => {
    const src = read('src/contexts/pantryContext.tsx');
    assert.match(
      src,
      /if \(!isAuthenticated\) return;[\s\S]{0,200}userPreferencesApi\.get\(\)/,
      'preferences fetch must be gated on auth',
    );
    assert.match(src, /\}, \[isAuthenticated\]\);/);
  });

  it('app shell (AppDrawer -> /api/chat/sessions) never mounts while logged out', () => {
    const src = read('src/App.tsx');
    assert.match(src, /const isGuestView = !isAuthenticated \|\| GUEST_VIEWS\.has\(currentView\);/);
    assert.match(src, /\{!isGuestView && \(\s*<AppDrawer/);
  });
});

describe('landing hero', () => {
  it('paints an eager, high-priority <img> instead of waiting for the Player', () => {
    const src = read('src/components/MarketingLanding.tsx');
    const hero = src.slice(src.indexOf('function HeroVisual'), src.indexOf('export function MarketingLanding'));
    assert.match(hero, /<img[\s\S]*?src=\{HERO_IMAGE\}[\s\S]*?loading="eager"/);
    assert.match(hero, /fetchpriority: 'high'/);
    assert.doesNotMatch(hero, /loading="lazy"|IntersectionObserver|RevealOnScroll/);
    // The static image must not be inside a reduced-motion-only branch.
    assert.doesNotMatch(hero, /if \(prefersReducedMotion\) \{\s*return/);
  });
});

describe('password reset entry point', () => {
  it('"Forgot password?" no longer links to "#"', () => {
    const src = read('src/components/Login.tsx');
    assert.doesNotMatch(src, /href="#"/);
    assert.match(src, /href="\/forgot-password"/);
  });

  it('every locale has the reset + not-found strings', () => {
    const keys: Array<[string, string]> = [
      ['auth', 'forgotTitle'],
      ['auth', 'sendResetLink'],
      ['auth', 'resetRequestSent'],
      ['auth', 'resetTitle'],
      ['auth', 'newPassword'],
      ['auth', 'setNewPassword'],
      ['auth', 'resetSuccess'],
      ['auth', 'resetInvalidLink'],
      ['auth', 'requestNewLink'],
      ['auth', 'backToLogin'],
      ['auth', 'googleAccountHint'],
      ['auth', 'tooManyAttempts'],
      ['notFound', 'title'],
      ['notFound', 'body'],
      ['notFound', 'home'],
    ];
    for (const locale of ['en', 'zh']) {
      const json = JSON.parse(read(`src/i18n/locales/${locale}.json`)) as Record<string, Record<string, string>>;
      for (const [ns, key] of keys) {
        assert.ok(json[ns]?.[key]?.trim(), `${locale}.${ns}.${key} missing`);
      }
    }
  });
});

describe('Stripe checkout return', () => {
  it('re-polls subscription status a bounded number of times after ?subscription=success', () => {
    const src = read('src/components/SubscriptionPanel.tsx');
    assert.match(src, /if \(!active \|\| !checkoutSuccess \|\| statusIsPro\) return;/);
    assert.match(src, /attempts >= CHECKOUT_STATUS_POLL_MAX/);
  });
});
