import { test, expect } from '@playwright/test';
import { navigateToView, waitForViewStable } from '../helpers/navigation';

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1024, height: 768 },
  { name: 'wide-desktop', width: 1440, height: 900 },
];

const views = [
  'login',
  'signup',
  'home',
  'aiAssistant',
  'calendar',
  'pantryInventory',
  'shoppingList',
  'recipeManager',
  'settings',
];

for (const vp of viewports) {
  test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const view of views) {
      test(`${view} matches snapshot`, async ({ page }) => {
        test.setTimeout(60000);
        await navigateToView(page, view);
        await waitForViewStable(page);
        await expect(page).toHaveScreenshot(`${view}-${vp.name}.png`, {
          fullPage: true,
        });
      });
    }
  });
}
