# Checklist: Design System Visual Alignment

Copy this checklist into the PR description or a review thread. Check each item before marking the PR ready for merge.

---

## Implementation

### `client/src/index.css`

- [x] **TASK-01** — Google Fonts `@import` is the first statement (before any `@tailwind` directives)
- [x] **TASK-02** — `:root {}` block declares all 5 color variables, 7 spacing variables, 4 shadow variables matching MASTER.md exactly
- [x] **TASK-03** — `body` has `background-color: var(--color-background)`, `color: var(--color-text)`, `font-family: 'Fira Sans'`
- [x] **TASK-03** — `h1`–`h6` have `font-family: 'Fira Code'` and `color: var(--color-text)`
- [x] **TASK-04** — `input`, `textarea`, `select` have `background-color: var(--color-secondary)`, `color: var(--color-text)`, dark border
- [x] **TASK-05** — `bg-white`, `bg-gray-50/100` resolve to `--color-primary` (`#0F172A`)
- [x] **TASK-05** — `bg-gray-200/300` resolve to `--color-secondary` (`#1E293B`)
- [x] **TASK-05** — `bg-gray-900`, `bg-black` resolve to `--color-background` (`#020617`)
- [x] **TASK-06** — `text-gray-800/900` resolve to `--color-text` (`#F8FAFC`)
- [x] **TASK-06** — `text-gray-500/600` resolve to slate-400 (`#94A3B8`) — muted, readable on dark
- [x] **TASK-06** — Semantic text colors (`text-green-*`, `text-red-*`) are NOT overridden globally
- [x] **TASK-07** — `border-gray-200/300` resolve to slate-700 (`#334155`)
- [x] **TASK-07** — `bg-green-500/600` resolve to `--color-cta` (`#22C55E`)
- [x] **TASK-08** — `*:focus-visible` shows `2px solid var(--color-cta)` outline
- [x] **TASK-08** — `button`, `a`, `[role="button"]` have `cursor: pointer`
- [x] **TASK-08** — `button`, `input`, `textarea`, `select` have `transition: all 200ms ease`
- [x] **TASK-08** — `@media (prefers-reduced-motion: reduce)` collapses all transitions/animations

### `client/src/components/AICookingAssistant.tsx`

- [x] **TASK-09** — Recipe card title JSX text node contains no emoji character
- [x] **TASK-09** — Emoji already absent; added `aria-label` on send button for a11y

---

## Automated verification

- [x] **TASK-10** — `npx playwright test e2e/a11y.spec.ts` passes (0 axe violations on Login, Home, AICookingAssistant)
- [x] **TASK-11** — `npx playwright test e2e/visual/` passes (36 screenshots match baselines, 0 px diff or within threshold)
- [x] **TASK-12** — `npm run lint:no-emoji` exits 0 (no emoji in any `.tsx` component)
- [x] **TASK-12** — CI pipeline runs `lint:no-emoji` and would fail on emoji insertion

---

## Functional regression

- [ ] Auth screens submit and navigate exactly as before (Login → Home, SignUp → Home)
- [ ] Navigation state and page switching unchanged on desktop and mobile
- [ ] Pantry, shopping list, calendar, recipe manager, AI assistant data operations unchanged
- [ ] Settings form saves successfully

---

## Accessibility

- [ ] Focus ring visible with keyboard Tab navigation on every interactive element
- [ ] Mouse click does **not** show focus ring (focus-visible behavior)
- [ ] `prefers-reduced-motion` enabled → no visible transitions or animations
- [ ] Muted helper text (`text-gray-500`) contrast ≥ 4.5:1 on dark backgrounds

---

## Visual

- [ ] No emojis used as icons in any view
- [ ] Responsive layout at 375, 768, 1024, 1440 px — no horizontal overflow
- [ ] Google sign-in icon retains original brand colors
- [ ] Google Fonts throttled/offline → app renders with system font fallbacks, no layout break

---

## CSP (if applicable)

- [ ] `style-src: https://fonts.googleapis.com` is allowed in CSP header (or fonts load correctly in the deployed environment)
- [ ] `font-src: https://fonts.gstatic.com` is allowed

---

## Rollback readiness

- [ ] Reviewer confirms: reverting `index.css` and the one `AICookingAssistant.tsx` line is sufficient to fully undo this feature
- [ ] No DB migration, API version, or feature flag required for rollback
