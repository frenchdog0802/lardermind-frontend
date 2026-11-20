/**
 * Client routes. The app is view-state driven (no URL router); only these paths are
 * real entry points. Everything else renders the NotFound page.
 *
 * Keep in sync with public/_redirects (rewrites known paths to / with 200, not
 * /index.html — Cloudflare Pages Pretty URLs would 308 /index.html to /.
 * Unknown paths fall through to 404.html with a real 404 on Cloudflare Pages).
 */
export type AppRoute =
  | 'home'
  | 'login'
  | 'signup'
  | 'pricing'
  | 'forgot-password'
  | 'reset-password'
  | 'mealime-alternative'
  | 'not-found';

const EXACT_ROUTES: Record<string, AppRoute> = {
  '/': 'home',
  '/index.html': 'home',
  '/app': 'home',
  '/login': 'login',
  '/signup': 'signup',
  '/pricing': 'pricing',
  '/forgot-password': 'forgot-password',
  '/reset-password': 'reset-password',
  '/mealime-alternative': 'mealime-alternative',
};

/**
 * Public SEO pages. They are NOT in public/_redirects: the build emits a dedicated
 * `<name>.html` per path (vite.config.js, seoPages) with its own head tags, which
 * Cloudflare Pages serves at the extensionless URL.
 */
export const SEO_PAGES = [
  {
    path: '/mealime-alternative',
    title: 'Mealime Alternative - Rebuild Your Week | LarderMind',
    description:
      "Mealime shut down on Oct 21, 2026. LarderMind plans a week of dinners from your pantry or a photo of your fridge, with a shopping list of only what's missing. Free to try.",
    h1: 'Rebuild your Mealime week in minutes',
    body: "Mealime shut down on Oct 21, 2026 and deleted users' plans with no export. LarderMind plans a week of dinners from what's in your pantry and fridge (type it in or snap a photo of your fridge), makes a shopping list of only what's missing, and has recipes. It works in English, Chinese, Spanish, French, German and Japanese. Free plan; Pro is $4.99/mo or $39.99/yr with a 7-day trial. LarderMind is not affiliated with Mealime. Please enable JavaScript to use the app.",
  },
] as const;

/** Paths (besides `/`) that must be rewritten to `/` by the host. */
export const SPA_REWRITE_PATHS = [
  '/app',
  '/app/*',
  '/login',
  '/signup',
  '/pricing',
  '/forgot-password',
  '/reset-password',
] as const;

export function resolveAppRoute(pathname: string): AppRoute {
  const path = (pathname || '/').replace(/\/+$/, '') || '/';
  const exact = EXACT_ROUTES[path.toLowerCase()];
  if (exact) return exact;
  // Reserved for future in-app deep links (e.g. /app/pantry); show the app, not a 404.
  if (/^\/app\//i.test(path)) return 'home';
  return 'not-found';
}

export const ROUTE_PATHS: Partial<Record<AppRoute, string>> = {
  home: '/',
  login: '/login',
  signup: '/signup',
  'forgot-password': '/forgot-password',
};
