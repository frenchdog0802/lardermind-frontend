# TASK-03: Apply Body and Heading Element Defaults

**Feature:** design-system-visual-alignment  
**File:** `client/src/index.css`  
**Depends on:** TASK-02 (requires `--color-*` variables)  
**Blocks:** none

---

## Description

Set element-level defaults for `body` and `h1`–`h6` so that the MASTER palette and fonts apply to all text without touching individual components.

---

## Implementation

Add after the `:root {}` block (before `@tailwind base`):

```css
body {
  background-color: var(--color-background);
  color: var(--color-text);
  font-family: 'Fira Sans', sans-serif;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Fira Code', monospace;
  color: var(--color-text);
}
```

---

## Acceptance Criteria

- [ ] `document.body` computed style shows `background-color: #020617` and `color: #F8FAFC`.
- [ ] `document.body` computed style shows `font-family` containing `Fira Sans`.
- [ ] Any `<h1>`–`<h6>` element shows `font-family` containing `Fira Code` in DevTools.
- [ ] Any `<h1>`–`<h6>` element shows `color: #F8FAFC`.
- [ ] No `<p>`, `<span>`, or other elements are affected by the heading rule.
- [ ] Existing tests pass without modification.
- [ ] The page has no horizontal overflow at 375 px viewport width after this change.
