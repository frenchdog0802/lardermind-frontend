# TASK-06: Remap Tailwind Text Color Utility Classes

**Feature:** design-system-visual-alignment  
**File:** `client/src/index.css`  
**Depends on:** TASK-02 (requires `--color-*` variables)  
**Blocks:** none

---

## Description

Override Tailwind `text-gray-*` and `text-slate-*` utilities with `!important` so all body text, headings, and muted labels resolve to the MASTER text palette on dark backgrounds.

---

## Implementation

Add a `/* Text color utility overrides */` section:

```css
/* Text color utility overrides */
.text-gray-900,
.text-gray-800,
.text-gray-700,
.text-slate-900,
.text-slate-800 {
  color: var(--color-text) !important;        /* #F8FAFC */
}

.text-gray-600,
.text-gray-500,
.text-slate-600,
.text-slate-500 {
  color: #94A3B8 !important;                  /* slate-400 — muted on dark */
}

.text-gray-400,
.text-gray-300 {
  color: #64748B !important;                  /* slate-500 — dimmer muted */
}
```

Do **not** override `text-green-*`, `text-red-*`, `text-yellow-*`, `text-blue-*` — semantic indicator colors remain as-is.

---

## Acceptance Criteria

- [ ] Any element with `text-gray-800` or `text-gray-900` computes `color: #F8FAFC`.
- [ ] Any element with `text-gray-500` or `text-gray-600` computes `color: #94A3B8` (muted slate).
- [ ] Muted helper text is readable against `--color-primary` background — contrast ratio ≥ 4.5:1 (verify with browser DevTools or axe).
- [ ] `text-green-500`, `text-red-500` etc. are **not** overridden — they retain original Tailwind values.
- [ ] No semantic color (success, error, warning) is overridden.
- [ ] All nine views render legible text (spot-check each screen).
- [ ] Existing tests pass without modification.

---

## Contrast reference

| Text role | Foreground | Background | Minimum ratio |
|-----------|------------|------------|---------------|
| Primary text | `#F8FAFC` | `#0F172A` | ≥ 7:1 |
| Muted text | `#94A3B8` | `#0F172A` | ≥ 4.5:1 |
| Dimmer muted | `#64748B` | `#0F172A` | check; adjust if < 4.5:1 |
