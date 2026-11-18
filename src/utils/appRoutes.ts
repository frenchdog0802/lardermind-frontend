/**
 * Client routes. The app is view-state driven (no URL router); only these paths are
 * real entry points. Everything else renders the NotFound page.
 *
 * Keep in sync with public/_redirects (rewrites known paths to index.html with 200;
 * unknown paths fall through to 404.html with a real 404 status on Cloudflare Pages).
 */
export type AppRoute =
  | 'home'
  | 'login'
  | 'signup'
  | 'pricing'
  | 'forgot-password'
  | 'reset-password'
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
};

/** Paths (besides `/`) that must be rewritten to index.html by the host. */
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
