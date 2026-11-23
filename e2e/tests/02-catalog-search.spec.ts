import { expect, test } from '@playwright/test';

test.describe('Catalog and search smoke', () => {
  test('renders search page and 404 fallback cleanly', async ({ page }) => {
    await page.goto('/search');
    await expect(page.locator('body')).toBeVisible();

    await page.goto('/non-existent-nexus-route-check');
    await expect(page.getByText('404')).toBeVisible();
  });
});
