import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'app');

const requiredFiles = ['robots.txt', 'sitemap.xml', 'og-image.png', 'favicon.ico', 'icon-512.png', 'site.webmanifest', 'index.html'];
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
  'https://lardermind.com/mealime-alternative',
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
  'https://lardermind.com/og-image.png',
];
for (const needle of headNeedles) {
  if (!indexHtml.includes(needle)) {
    console.error(`seo-static-smoke: index.html missing ${needle}`);
    process.exit(1);
  }
}

// Public SEO pages: dedicated prerendered HTML with its own head tags.
const page = join(dist, 'mealime-alternative.html');
if (!existsSync(page)) {
  console.error('seo-static-smoke: missing dist/app/mealime-alternative.html');
  process.exit(1);
}
const pageHtml = readFileSync(page, 'utf8');
for (const needle of [
  '<title>Mealime Alternative',
  'rel="canonical" href="https://lardermind.com/mealime-alternative"',
  'property="og:url" content="https://lardermind.com/mealime-alternative"',
  '<h1>Rebuild your Mealime week in minutes</h1>',
]) {
  if (!pageHtml.includes(needle)) {
    console.error(`seo-static-smoke: mealime-alternative.html missing ${needle}`);
    process.exit(1);
  }
}

console.log('seo-static-smoke: ok');
