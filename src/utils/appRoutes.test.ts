import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { resolveAppRoute, SPA_REWRITE_PATHS } from './appRoutes.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('resolveAppRoute', () => {
  it('maps known entry points', () => {
    assert.equal(resolveAppRoute('/'), 'home');
    assert.equal(resolveAppRoute(''), 'home');
    assert.equal(resolveAppRoute('/login'), 'login');
    assert.equal(resolveAppRoute('/login/'), 'login');
    assert.equal(resolveAppRoute('/signup'), 'signup');
    assert.equal(resolveAppRoute('/pricing'), 'pricing');
    assert.equal(resolveAppRoute('/forgot-password'), 'forgot-password');
    assert.equal(resolveAppRoute('/reset-password'), 'reset-password');
    assert.equal(resolveAppRoute('/app'), 'home');
    assert.equal(resolveAppRoute('/app/pantry'), 'home');
  });

  it('treats unknown paths as not found (was: home page)', () => {
    assert.equal(resolveAppRoute('/nonexistent'), 'not-found');
    assert.equal(resolveAppRoute('/login/extra'), 'not-found');
    assert.equal(resolveAppRoute('/application'), 'not-found');
  });
});

describe('Cloudflare Pages routing config', () => {
  const redirects = readFileSync(join(root, 'public/_redirects'), 'utf8');
  const rules = redirects
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/));

  it('has no catch-all rewrite (it would turn every unknown URL into a 200 home page)', () => {
    assert.ok(!rules.some(([from]) => from === '/*'), 'remove "/* /index.html 200"');
  });

  it('rewrites every SPA deep link to index.html with 200', () => {
    for (const path of SPA_REWRITE_PATHS) {
      assert.ok(
        rules.some(([from, to, status]) => from === path && to === '/index.html' && status === '200'),
        `missing _redirects rule for ${path}`,
      );
    }
    const routedPaths = rules.map(([from]) => from).sort();
    assert.deepEqual(routedPaths, [...SPA_REWRITE_PATHS].sort(), 'rules and SPA_REWRITE_PATHS must match');
  });

  it('build emits 404.html from index.html', () => {
    const vite = readFileSync(join(root, 'vite.config.js'), 'utf8');
    assert.match(vite, /copyFileSync\(join\(dir, "index\.html"\), join\(dir, "404\.html"\)\)/);
    assert.match(vite, /plugins: \[react\(\), spaNotFoundPage\(\)\]/);
  });
});
