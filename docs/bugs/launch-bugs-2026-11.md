# Launch bugs — 2026-11 (frontend)

Combined bug record for the production E2E pass (branch `fix/launch-bugs`). Backend items: see
`lardermind-backend/docs/bugs/launch-bugs-2026-11.md`.

## a. "1 liter milk" shows "0 l" in the pantry
- **Current / expected:** chat adds milk `{quantity: 1, unit: "l"}`; pantry shows `0 l`. Expected `1 l`.
- **Root cause:** `formatQuantity()` (`src/utils/units.ts`) treated every stored quantity as canonical ml / g and
  called `fromBase(1, 'l')` = 0.001, rounded to `0`. Pantry/shopping/recipe rows store quantity *in their own unit*
  (the backend keeps units verbatim). Same bug showed `2 kg` as `0 kg`.
- **Fix:** convert from the row's unit to canonical first (`toBase`), then pick the display unit; `QuantityLabel`
  passes the stored `unit` as the source unit.
- **Regression test:** `src/utils/units.test.ts` (1 l, 1.5 "liter", 2 kg, unchanged ml/g).

## b. Manual add: unit shows "g" but saves "500 pcs"
- **Current / expected:** untouched unit select shows `g`; item saved as `500 pcs`. The unit shown must be saved.
- **Root cause:** form state kept `unit: ''`; `UnitSelect` *displays* `options[0]` (`g`) for an empty value, the
  empty unit was sent, and the backend defaulted it to `pcs`.
- **Fix:** shared `unitSelectOptions()` + `resolveSelectedUnit()` in `units.ts`; `UnitSelect` and
  `PantryInventory.handleAddItem` both use them, so the persisted unit is exactly the displayed one.
- **Regression test:** `src/utils/units.test.ts` (unit select default), `PantryInventory.unit-merge.test.ts`.

## c. "200 AI messages/day" vs 150
- Frontend copy (`PricingSection` fallback, `SubscriptionPanel`) already says 150 and the live pricing uses
  `/api/subscription/plans` (`PRO_TIER.aiMessagesPerDay = 150`, enforced). The 200 is only in the Stripe product
  description (dashboard) and stale backend docs — see backend doc. No frontend change.

## d. Approve counted as an AI message
- Frontend `handleResume` only calls `POST /api/chat/resume` (no extra send/stream). See backend doc.

## e. "Forgot password?" went to `/#`
- **Fix:** `/forgot-password` (email form, generic confirmation) and `/reset-password?token=…` (new password +
  confirm, signup rule ≥ 8 chars; token stripped from the address bar on load; invalid/expired link offers a new
  request). Strings added to `en` and `zh`. Components: `src/components/PasswordReset.tsx`.
- **Regression test:** `src/components/launch-regressions.test.ts` (link target, locale keys).

## f. Unknown routes returned the home page with 200
- **Root cause:** no URL routing at all (`index.tsx` renders `App` for every path) and `public/_redirects` had
  `/* /index.html 200`, so every path was a 200 home page.
- **Fix:** `src/utils/appRoutes.ts` resolves the few real entry points (`/`, `/login`, `/signup`, `/pricing`,
  `/forgot-password`, `/reset-password`, `/app`, `/app/*`); everything else renders `NotFound` (+ `noindex`).
  `_redirects` now rewrites only those paths; the build copies `index.html` to `404.html`, so Cloudflare Pages
  returns a real **404** for other paths while still rendering the NotFound page.
- **Trade-off:** new client routes must be added to `appRoutes.ts` *and* `_redirects` (test enforces parity).
- **Regression test:** `src/utils/appRoutes.test.ts`.

## g. Checkout success return
- Backend already used `/?subscription=success` / `?subscription=cancelled`; `App` routes to the Plan screen and
  shows the banner. **Gap fixed:** the webhook can land after the redirect, so status still read Free.
  `SubscriptionPanel` now re-polls status every 3 s, max 5 times, until Pro (no endless loop).
- **Regression test:** `launch-regressions.test.ts`.

## h. Landing page fired 401s
- **Root cause:** (1) `PantryProvider` called `GET /api/user-preferences` on mount regardless of auth;
  (2) on the first render after auth init `currentView` was still `aiAssistant`, so `AppDrawer` mounted and called
  `GET /api/chat/sessions` before the effect switched to `landing`.
- **Fix:** preferences load only when `isAuthenticated`; the app shell is never rendered while logged out.
  No retries were added. (`/api/subscription/plans` is public and unaffected.)
- **Regression test:** `launch-regressions.test.ts`.

## i. Hero image blank until scroll
- **Root cause:** the above-the-fold hero was painted only by the Remotion `<Player>` (its own `<Img>` over an
  opaque beige background), which stays blank until the Player has measured its container / loaded the frame.
- **Fix:** an eager `<img loading="eager" fetchpriority="high">` is always painted first; the Player is layered on
  top with a transparent background. No lazy loading / observers on the hero.
- **Regression test:** `launch-regressions.test.ts`.
