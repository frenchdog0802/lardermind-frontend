# TASK-08: Add Accessibility and Interaction Rules

**Feature:** design-system-visual-alignment  
**File:** `client/src/index.css`  
**Depends on:** TASK-02 (requires `--color-cta` for focus ring)  
**Blocks:** none

---

## Description

Add four accessibility and interaction rules to `index.css`:

1. Visible focus ring for keyboard navigation (`focus-visible`).
2. Pointer cursor on all interactive controls.
3. Smooth 200ms transitions on interactive elements.
4. `prefers-reduced-motion` override that collapses all transitions/animations.

---

## Implementation

Add an `/* Accessibility and interaction */` section:

```css
/* Accessibility and interaction */
*:focus-visible {
  outline: 2px solid var(--color-cta);
  outline-offset: 2px;
}

button,
a,
[role="button"] {
  cursor: pointer;
}

button,
input,
textarea,
select {
  transition: all 200ms ease;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Acceptance Criteria

- [ ] Tabbing through Login form shows a visible green (`#22C55E`) outline on each focused element.
- [ ] Tabbing through all authenticated views shows focus rings on every interactive element.
- [ ] All `<button>` and `<a>` elements show `cursor: pointer` on hover.
- [ ] Hovering an `<input>` or `<button>` shows a transition animation (200ms ease, not instant).
- [ ] With OS "Reduce Motion" enabled (macOS: Accessibility → Display; Windows: Ease of Access → Display), no visible transitions or animations occur.
- [ ] `outline` does not appear on mouse click (only keyboard focus) — `focus-visible` selector is used, not `focus`.
- [ ] Existing tests pass without modification.
