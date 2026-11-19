import type { Page } from '@playwright/test';

export const TEST_USER = {
  id: 'e2e-test-user',
  name: 'E2E User',
  first_name: 'E2E',
  last_name: 'User',
  email: 'e2e@test.com',
};

const PRIMARY_VIEWS: Record<string, string> = {
  home: 'Home',
  aiAssistant: 'AI Chat',
  calendar: 'Calendar',
  pantryInventory: 'Pantry',
};

const SECONDARY_VIEWS: Record<string, string> = {
  shoppingList: 'Shopping',
  recipeManager: 'Recipes',
  settings: 'Settings',
};

const DESKTOP_NAV_LABELS: Record<string, string> = {
  shoppingList: 'Shopping List',
  recipeManager: 'Recipes',
  settings: 'Settings',
};

const VIEW_MARKERS: Record<string, string> = {
  login: 'Sign in to your account',
  signup: 'Create your account',
  home: 'Welcome,',
  aiAssistant: 'AI Cooking Assistant',
  calendar: 'Cooking Calendar',
  pantryInventory: 'Kitchen Inventory',
  shoppingList: 'Shopping List',
  recipeManager: 'Recipe Manager',
  settings: 'Settings',
};

export async function setupAuthenticatedSession(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('jwt', JSON.stringify('e2e-test-jwt'));
  }, TEST_USER);
}

async function waitForAuthenticatedShell(page: Page) {
  await page.getByRole('button', { name: 'Home' }).first().waitFor({
    state: 'visible',
    timeout: 15000,
  });
}

async function clickSidebarNav(page: Page, label: string) {
  await page.locator('aside nav').getByRole('button', { name: label, exact: true }).click();
}

export async function navigateToView(page: Page, view: string) {
  if (view === 'login') {
    await page.goto('/');
    await page.getByText('Sign in to your account').waitFor({ state: 'visible' });
    return;
  }

  if (view === 'signup') {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign up' }).click();
    await page.getByText('Create your account').waitFor({ state: 'visible' });
    return;
  }

  await setupAuthenticatedSession(page);
  await page.goto('/');
  await waitForAuthenticatedShell(page);

  if (view === 'home') {
    await page.getByText('Welcome,').waitFor({ state: 'visible' });
    return;
  }

  const primaryLabel = PRIMARY_VIEWS[view];
  if (primaryLabel) {
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      await clickSidebarNav(page, primaryLabel === 'AI Chat' ? 'AI Chat' : primaryLabel);
    } else {
      await page.getByRole('button', { name: primaryLabel, exact: true }).first().click();
    }
  } else {
    const secondaryLabel = SECONDARY_VIEWS[view];
    if (!secondaryLabel) {
      throw new Error(`Unknown view: ${view}`);
    }

    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      await clickSidebarNav(page, DESKTOP_NAV_LABELS[view]);
    } else {
      await page.getByRole('button', { name: 'More', exact: true }).click();
      await page
        .locator('.absolute.bottom-20')
        .getByRole('button', { name: secondaryLabel, exact: true })
        .click();
    }
  }

  const marker = VIEW_MARKERS[view];
  if (marker === 'Welcome,') {
    await page.getByText(marker).waitFor({ state: 'visible' });
  } else if (marker) {
    await page.getByRole('heading', { name: marker }).waitFor({ state: 'visible' });
  }
}

export async function waitForViewStable(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(750);
}
