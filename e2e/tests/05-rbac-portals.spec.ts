import { expect, test } from '@playwright/test';

test.describe('RBAC route protection smoke', () => {
  for (const protectedPath of ['/buyer', '/seller', '/staff', '/admin']) {
    test(`redirects unauthenticated visitor from ${protectedPath} to /login`, async ({ page }) => {
      await page.goto(protectedPath);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});
