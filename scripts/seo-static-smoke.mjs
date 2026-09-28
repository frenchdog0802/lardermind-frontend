import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'app');

const requiredFiles = ['robots.txt', 'sitemap.xml', 'og.jpg', 'index.html'];
const missing = requiredFiles.filter((name) => !existsSync(join(dist, name)));
if (missing.length) {
  console.error(`seo-static-smoke: missing in dist/app: ${missing.join(', ')}`);
  console.error('Run `npm run build` first.');
  process.exit(1);
}

const robots = readFileSync(join(dist, 'robots.txt'), 'utf8');
if (!robots.includes('Sitemap: https://lardermind.com/sitemap.xml')) {
  console.error('seo-static-smoke: robots.txt missing sitemap directive');
  process.exit(1);
}

const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
const requiredLocs = [
  'https://lardermind.com/',
  'https://lardermind.com/legal/privacy-policy.html',
  'https://lardermind.com/legal/terms-of-service.html',
];
for (const loc of requiredLocs) {
  if (!sitemap.includes(`<loc>${loc}</loc>`)) {
    console.error(`seo-static-smoke: sitemap missing ${loc}`);
    process.exit(1);
  }
}

const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8');
const headNeedles = [
  'name="description"',
  'rel="canonical"',
  'property="og:image"',
  'name="twitter:card"',
  'application/ld+json',
  'https://lardermind.com/og.jpg',
];
for (const needle of headNeedles) {
  if (!indexHtml.includes(needle)) {
    console.error(`seo-static-smoke: index.html missing ${needle}`);
    process.exit(1);
  }
}

console.log('seo-static-smoke: ok');
