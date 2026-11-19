# TASK-11: Visual Regression Tests (Playwright Screenshot Diff)

**Feature:** design-system-visual-alignment  
**File:** `client/e2e/visual/`  
**Depends on:** TASK-02 through TASK-08 (palette must be fully applied before capturing baselines)  
**Blocks:** none

---

## Description

Capture Playwright screenshot baselines for all 9 views at 4 viewport widths and commit them as the approved visual state. Future CI runs diff against these baselines to catch unintended regressions.

---

## Viewport matrix

```typescript
const viewports = [
  { name: 'mobile',        width: 375,  height: 812 },
  { name: 'tablet',        width: 768,  height: 1024 },
  { name: 'desktop',       width: 1024, height: 768 },
  { name: 'wide-desktop',  width: 1440, height: 900 },
];
```

---

## Implementation

Create `client/e2e/visual/visual-regression.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile',       width: 375,  height: 812 },
  { name: 'tablet',       width: 768,  height: 1024 },
  { name: 'desktop',      width: 1024, height: 768 },
  { name: 'wide-desktop', width: 1440, height: 900 },
];

const views = [
  'login', 'signup', 'home', 'aiAssistant',
  'calendar', 'pantryInventory', 'shoppingList',
  'recipeManager', 'settings',
];

for (const vp of viewports) {
  test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const view of views) {
      test(`${view} matches snapshot`, async ({ page }) => {
        // Navigate + auth setup as needed
        await page.goto(`/?view=${view}`);
        await expect(page).toHaveScreenshot(`${view}-${vp.name}.png`);
      });
    }
  });
}
```

Run once with `--update-snapshots` to establish baselines. Commit the `.png` files under `client/e2e/visual/__snapshots__/`.

---

## Acceptance Criteria

- [ ] 36 baseline screenshots captured (9 views × 4 viewports) and committed.
- [ ] `npx playwright test e2e/visual/` passes on a clean run (diff = 0 px or within threshold).
- [ ] Each screenshot shows the dark MASTER palette (spot-check: background is `#020617`, not white).
- [ ] No horizontal scrollbar visible in any mobile (375 px) screenshot.
- [ ] Playwright config has a pixel-diff threshold set (e.g. `maxDiffPixelRatio: 0.01`).
- [ ] CI pipeline runs visual regression tests and fails the build on unexpected diffs.
