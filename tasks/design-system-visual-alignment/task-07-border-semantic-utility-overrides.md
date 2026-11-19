# TASK-07: Remap Tailwind Border and Semantic Color Utilities

**Feature:** design-system-visual-alignment  
**File:** `client/src/index.css`  
**Depends on:** TASK-02 (requires `--color-*` variables)  
**Blocks:** none

---

## Description

Override Tailwind border-color utilities and remap CTA/accent usage so that borders and interactive accent elements render with the MASTER dark palette. Map `bg-green-*` badges and `text-green-*` to `--color-cta` where intentional.

---

## Implementation

Add a `/* Border and accent utility overrides */` section:

```css
/* Border utility overrides */
.border-gray-200,
.border-gray-300,
.border-slate-200,
.border-slate-300 {
  border-color: #334155 !important; /* slate-700 */
}

.border-gray-100,
.border-white {
  border-color: #1E293B !important; /* secondary */
}

/* CTA accent — shopping list badges, KPI indicators */
.bg-green-500,
.bg-green-600 {
  background-color: var(--color-cta) !important; /* #22C55E */
}

.text-green-600,
.text-green-500 {
  color: var(--color-cta) !important;
}

/* Hover tint on interactive elements */
.hover\:bg-gray-100:hover,
.hover\:bg-gray-50:hover {
  background-color: color-mix(in srgb, var(--color-secondary) 80%, var(--color-cta) 20%) !important;
}
```

---

## Acceptance Criteria

- [ ] Any element with `border-gray-200` computes `border-color: #334155`.
- [ ] Shopping list category badges using `bg-green-500` render as `#22C55E`.
- [ ] `text-green-500` or `text-green-600` elements render as `#22C55E`.
- [ ] `border-red-*`, `border-blue-*`, `border-yellow-*` are **not** overridden.
- [ ] No visible element has a white or very light border against a dark card (visual check all screens).
- [ ] Hover state on nav links and buttons shows a subtle green tint (spot-check Sidebar).
- [ ] Existing tests pass without modification.
