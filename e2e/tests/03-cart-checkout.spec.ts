import { expect, test } from '@playwright/test';

test.describe('Cart and checkout smoke', () => {
  test('displays empty cart state and protects checkout route', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/login/);
  });
});
