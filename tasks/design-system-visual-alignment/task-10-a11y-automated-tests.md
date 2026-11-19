# TASK-10: Automated Accessibility Tests (axe-core)

**Feature:** design-system-visual-alignment  
**File:** `client/e2e/` or `client/src/__tests__/`  
**Depends on:** TASK-02 through TASK-08 (palette and a11y rules must be applied first)  
**Blocks:** none

---

## Description

Write automated accessibility tests using Playwright + `@axe-core/playwright` (or `jest-axe` if using JSDOM) that assert:

- No WCAG contrast failures on the dark palette.
- Focus indicators are present on all interactive elements.

Scope: Login, Home, and AICookingAssistant views (highest risk for contrast issues).

---

## Implementation

Install if not present:

```bash
npm install --save-dev @axe-core/playwright
```

Create `client/e2e/a11y.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const views = [
  { name: 'login', url: '/' },
  // Authenticated views require login first — use storageState fixture
  { name: 'home', url: '/?view=home' },
  { name: 'aiAssistant', url: '/?view=aiAssistant' },
];

for (const view of views) {
  test(`${view.name} has no critical a11y violations`, async ({ page }) => {
    await page.goto(view.url);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
```

Adjust navigation strategy (storageState / login helper) to match the existing Playwright setup.

---

## Acceptance Criteria

- [ ] `npx playwright test e2e/a11y.spec.ts` exits with code 0.
- [ ] axe reports zero violations with tags `wcag2a` and `wcag2aa` on Login view.
- [ ] axe reports zero violations on Home view (authenticated).
- [ ] axe reports zero violations on AICookingAssistant view (authenticated).
- [ ] Test output is CI-compatible (JUnit XML or JSON report generated).
- [ ] Test file is placed under the existing test directory structure (no new top-level folders).
