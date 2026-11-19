# TASK-02: Define CSS Custom Properties (:root design tokens)

**Feature:** design-system-visual-alignment  
**File:** `client/src/index.css`  
**Depends on:** TASK-01 (import must precede token block)  
**Blocks:** TASK-03, TASK-04, TASK-05, TASK-06, TASK-07, TASK-08

---

## Description

Add a `:root {}` block to `client/src/index.css` that declares all design tokens from `MASTER.md`: color palette, spacing scale, and shadow scale.  
These variables are the single source of truth for all downstream CSS rules in this feature.

---

## Implementation

Add after the `@import` line and before `@tailwind base`:

```css
:root {
  /* Color palette — MASTER.md */
  --color-primary:    #0F172A;
  --color-secondary:  #1E293B;
  --color-cta:        #22C55E;
  --color-background: #020617;
  --color-text:       #F8FAFC;

  /* Spacing scale */
  --space-xs:   0.25rem;   /* 4px  */
  --space-sm:   0.5rem;    /* 8px  */
  --space-md:   1rem;      /* 16px */
  --space-lg:   1.5rem;    /* 24px */
  --space-xl:   2rem;      /* 32px */
  --space-2xl:  3rem;      /* 48px */
  --space-3xl:  4rem;      /* 64px */

  /* Shadow scale */
  --shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md:  0 4px 6px rgba(0, 0, 0, 0.5);
  --shadow-lg:  0 10px 15px rgba(0, 0, 0, 0.6);
  --shadow-xl:  0 20px 25px rgba(0, 0, 0, 0.7);
}
```

---

## Acceptance Criteria

- [ ] All five color variables are present with the exact hex values from MASTER.md.
- [ ] All seven spacing variables are present with correct rem values.
- [ ] All four shadow variables are present.
- [ ] In browser DevTools → Elements → Computed, `:root` shows all `--color-*`, `--space-*`, `--shadow-*` variables.
- [ ] `var(--color-cta)` evaluates to `#22C55E` in DevTools.
- [ ] No other CSS rules are added in this task (tokens only).
- [ ] Existing tests pass without modification.
