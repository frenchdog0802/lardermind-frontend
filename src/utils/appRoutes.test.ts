import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { resolveAppRoute, SEO_PAGES, SPA_REWRITE_PATHS } from './appRoutes.ts';

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
    assert.equal(resolveAppRoute('/mealime-alternative'), 'mealime-alternative');
    assert.equal(resolveAppRoute('/mealime-alternative/'), 'mealime-alternative');
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

  it('rewrites every SPA deep link to / with 200 (not /index.html)', () => {
    for (const path of SPA_REWRITE_PATHS) {
      assert.ok(
        rules.some(([from, to, status]) => from === path && to === '/' && status === '200'),
        `missing _redirects rule for ${path}`,
      );
    }
    const routedPaths = rules.map(([from]) => from).sort();
    assert.deepEqual(routedPaths, [...SPA_REWRITE_PATHS].sort(), 'rules and SPA_REWRITE_PATHS must match');
    assert.ok(
      rules.every(([, to]) => to === '/' && !to.endsWith('.html')),
      'rewrite destinations must be /; /index.html is 308-canonicalized to / by Pages Pretty URLs',
    );
  });

  it('build emits 404.html from index.html', () => {
    const vite = readFileSync(join(root, 'vite.config.js'), 'utf8');
    assert.match(vite, /copyFileSync\(join\(dir, "index\.html"\), join\(dir, "404\.html"\)\)/);
    assert.match(vite, /plugins: \[react\(\), spaNotFoundPage\(\), seoPages\(\)\]/);
  });

  it('serves public SEO pages from prerendered <path>.html, not an SPA rewrite', () => {
    const vite = readFileSync(join(root, 'vite.config.js'), 'utf8');
    assert.match(vite, /SEO_PAGES/);
    const sitemap = readFileSync(join(root, 'public/sitemap.xml'), 'utf8');
    for (const page of SEO_PAGES) {
      assert.ok(!rules.some(([from]) => from === page.path), `${page.path} must not be rewritten to /`);
      assert.ok(sitemap.includes(`<loc>https://lardermind.com${page.path}</loc>`), `sitemap missing ${page.path}`);
      assert.equal(resolveAppRoute(page.path), 'mealime-alternative');
      assert.ok(page.title.length <= 60, 'title should fit a SERP snippet');
      assert.ok(page.description.length <= 200);
    }
  });
});
