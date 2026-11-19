# TASK-04: Apply Form Control Element Defaults

**Feature:** design-system-visual-alignment  
**File:** `client/src/index.css`  
**Depends on:** TASK-02 (requires `--color-*` variables)  
**Blocks:** none

---

## Description

Set element-level defaults for `input`, `textarea`, `select`, and `button` so form controls inherit the dark palette without editing each component file.

---

## Implementation

Add after the heading defaults from TASK-03:

```css
input,
textarea,
select {
  background-color: var(--color-secondary);
  color: var(--color-text);
  border: 1px solid #334155; /* slate-700 */
  font-family: 'Fira Sans', sans-serif;
}

button {
  font-family: 'Fira Sans', sans-serif;
}
```

---

## Acceptance Criteria

- [ ] Any `<input>` element (e.g. Login email field) has computed `background-color: #1E293B`.
- [ ] Any `<input>` element has computed `color: #F8FAFC`.
- [ ] Any `<input>` element has a visible border (slate-700 or equivalent dark tone).
- [ ] `<select>` dropdowns render with dark background in all tested browsers (Chrome, Firefox).
- [ ] `<textarea>` renders with dark background.
- [ ] Placeholder text is visible — not hidden by background collision (spot-check in DevTools).
- [ ] Login and Settings forms still submit successfully (functional regression check).
- [ ] Existing tests pass without modification.

---

## Edge cases

| Scenario | Expected |
|----------|----------|
| Third-party embedded inputs | May inherit dark background; document if found |
| Date-picker native controls | Inherits dark; native calendar popup may differ by OS |
