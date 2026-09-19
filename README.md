# LarderMind web (`frontend/`)

React + Vite SPA. Target host: **Cloudflare Pages**. API: **Cloudflare Workers** (`backend-cf/`, port **8787** locally).

Feature: see backend remote [`docs/features/frontend-cf-pages.md`](../docs/features/frontend-cf-pages.md) (docs live in **lardermind-backend**).

## Local

1. Start API: `cd backend-cf && npm run dev` (port **8787**). For Workers AI chat use `npm run dev:remote` after `wrangler login`.
2. Copy `.env.example` → `.env` (leave `VITE_API_BASE_URL` empty to use the Vite proxy).
3. Run:

```powershell
npm install
npm run dev
```

App: `http://localhost:5173`. Vite proxies `/api` and `/auth` → `http://127.0.0.1:8787`.

## Build

```powershell
npm run build
```

Output: `dist/app` (see `vite.config.js` `build.outDir`).

## Cloudflare Pages

Config: [`wrangler.toml`](./wrangler.toml) (`pages_build_output_dir = "dist/app"`).  
SPA fallback: [`public/_redirects`](./public/_redirects) (`/* /index.html 200`).

### GitHub Actions (this remote)

Workflow: [`.github/workflows/pages.yml`](./.github/workflows/pages.yml)

On push to `main`/`master`: `npm ci` → `npm run build` → `wrangler pages deploy` → project **`lardermind-web`**.

Set these on **lardermind-frontend** (Settings → Secrets and variables → Actions):

| Name | Type | Purpose |
|------|------|---------|
| `CLOUDFLARE_API_TOKEN` | Secret | Token with **Account → Cloudflare Pages → Edit** (plus Account read as needed) |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Cloudflare account id |
| `VITE_API_BASE_URL` | Variable or secret | Worker base URL, e.g. `https://lardermind-api.<subdomain>.workers.dev` (no trailing slash) |
| `VITE_GOOGLE_CLIENT_ID` | Variable or secret (optional) | Google OAuth client id |

### CLI (after `npx wrangler login`)

```powershell
$env:VITE_API_BASE_URL="https://lardermind-api.<subdomain>.workers.dev"
npm run build
npx wrangler pages deploy dist/app --project-name=lardermind-web
```

### CORS

Add the Pages origin (e.g. `https://lardermind-web.pages.dev`) to Worker `CORS_ALLOWED_ORIGINS` in **lardermind-backend** `backend-cf/` (wrangler var or dashboard). See `backend-cf/README.md`.
