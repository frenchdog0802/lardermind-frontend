import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { navigateToView, waitForViewStable } from './helpers/navigation';

const views = [
  { name: 'login', view: 'login' },
  { name: 'home', view: 'home' },
  { name: 'aiAssistant', view: 'aiAssistant' },
];

for (const { name, view } of views) {
  test(`${name} has no critical a11y violations`, async ({ page }) => {
    await navigateToView(page, view);
    await waitForViewStable(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
