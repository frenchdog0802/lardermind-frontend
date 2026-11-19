# Design System Visual Alignment

## Goal
Align the frontend visual presentation with `client/design-system/lardermind/MASTER.md` while preserving all existing functional logic, state management, routing, and data-fetching behavior.

## Scope
- Applied global design tokens and theme remapping in `client/src/index.css`.
- Kept component logic intact (no changes to API calls, hooks, reducers/contexts, and view flow).
- Updated one anti-pattern violation in UI text (`AICookingAssistant`) by removing emoji icon usage in recipe card title.

## Requirements Analysis
- **Color palette:** moved app-wide presentation to the MASTER dark analytics palette:
  - Primary: `#0F172A`
  - Secondary: `#1E293B`
  - CTA: `#22C55E`
  - Background: `#020617`
  - Text: `#F8FAFC`
- **Typography:** imported and applied:
  - Heading font: `Fira Code`
  - Body font: `Fira Sans`
- **Motion and interaction:**
  - Applied 200ms transitions to interactive controls by default.
  - Added visible focus ring via `:focus-visible`.
  - Added `prefers-reduced-motion` support.
- **Component style intent:** existing button/input/card-heavy layout now renders in a consistent dark data-dashboard style through global utility remapping.

## Edge Cases
- **Class collisions:** utility remapping affects all components that use remapped Tailwind utility classes. This is intentional for broad alignment, but future one-off style exceptions may require local class overrides.
- **Third-party/embed UI:** if future components rely on original Tailwind color semantics, the global remap can visually alter them.
- **Toast/modal overlays:** darkened overlays may require per-screen adjustment if readability is reduced by underlying content.
- **Legacy static colors in SVGs:** embedded brand-color SVG paths (such as Google icon fills) are intentionally left unchanged.

## Security Issues Review
- **No new data paths introduced:** no changes to authentication, token flow, API request payloads, storage usage, or routing guards.
- **No new user-controlled HTML injection added:** existing `dangerouslySetInnerHTML` usage remains pre-existing and should be separately reviewed for sanitization policy.
- **No secret/config handling changes:** environment-variable usage is unchanged.

## UX Issues Review
- **Contrast:** dark palette improves consistency but must be validated screen-by-screen for all text variants, especially muted helper text.
- **Focus visibility:** improved globally with explicit focus ring.
- **Pointer affordance:** clickable controls already mostly use button semantics; global cursor rule reinforces requirement.
- **Anti-pattern compliance:** removed emoji in AI recipe title; icon set remains Lucide-based.

## Performance Issues Review
- **CSS-only styling change:** minimal runtime impact; no extra render loops introduced.
- **Font loading:** two Google fonts are added; this may slightly affect first paint on cold load.
- **Transition defaults:** 200ms transitions are lightweight; reduced-motion override prevents unnecessary animation cost for accessibility-sensitive users.

## Verification Checklist
- [ ] Auth screens still submit and navigate exactly as before.
- [ ] Navigation state and page switching behavior unchanged on desktop and mobile.
- [ ] Pantry, shopping list, calendar, recipe manager, and AI assistant data operations unchanged.
- [ ] Focus ring visible with keyboard navigation.
- [ ] No emojis used as icons in UI.
- [ ] Responsive checks at 375, 768, 1024, and 1440 widths.
- [ ] No horizontal overflow on mobile.

### Automated (completed)
- [x] Playwright + axe: Login, Home, AICookingAssistant — zero WCAG2a/AA violations.
- [x] Visual regression: 9 views × 4 viewports (36 baselines) pass in CI.
- [x] `npm run lint:no-emoji` passes on all `client/src/components/*.tsx`.
