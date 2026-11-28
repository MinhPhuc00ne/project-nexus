import { expect, test } from '@playwright/test';

test.describe('Auction portal smoke', () => {
  test('renders auction listing route without runtime errors', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.goto('/auction');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('heading', { name: /404/i })).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
});
