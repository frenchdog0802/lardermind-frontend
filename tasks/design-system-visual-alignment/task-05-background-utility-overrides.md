# TASK-05: Remap Tailwind Background Utility Classes

**Feature:** design-system-visual-alignment  
**File:** `client/src/index.css`  
**Depends on:** TASK-02 (requires `--color-*` variables)  
**Blocks:** none

---

## Description

Override the most common Tailwind background utilities with `!important` so that components using `bg-white`, `bg-gray-*`, and `bg-slate-*` resolve to the MASTER dark palette at paint time — without editing any component file.

---

## Implementation

Add a `/* Background utility overrides */` section after the element defaults:

```css
/* Background utility overrides */
.bg-white,
.bg-gray-50,
.bg-gray-100 {
  background-color: var(--color-primary) !important;
}

.bg-gray-200,
.bg-gray-300,
.bg-slate-800,
.bg-slate-900 {
  background-color: var(--color-secondary) !important;
}

.bg-gray-900,
.bg-black {
  background-color: var(--color-background) !important;
}
```

Gradient stops that use `from-white` / `to-gray-*` should also be addressed if present in components; add those overrides here as discovered during spot-check.

---

## Acceptance Criteria

- [ ] Any element with class `bg-white` computes `background-color: #0F172A` (primary).
- [ ] Any element with class `bg-gray-50` or `bg-gray-100` computes `background-color: #0F172A`.
- [ ] Any element with class `bg-gray-200` computes `background-color: #1E293B` (secondary).
- [ ] Any element with class `bg-gray-900` computes `background-color: #020617` (background).
- [ ] No element with `bg-green-*` or `bg-red-*` is accidentally overridden.
- [ ] The Home screen cards render with a dark background (visual check).
- [ ] The Login screen renders with dark background (visual check).
- [ ] No layout shift or overflow introduced at any viewport.
- [ ] Existing tests pass without modification.
