import { expect, test } from '@playwright/test';

test.describe('Home and i18n language switching', () => {
  test('switches between Vietnamese and English without changing URL and persists across reload', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Voucher GNM 0Đ')).toBeVisible();

    await page.getByTitle('Ngôn ngữ').click();
    await page.getByRole('button', { name: /English/i }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('0 VND Shipping Voucher')).toBeVisible();

    await page.reload();
    await expect(page.getByText('0 VND Shipping Voucher')).toBeVisible();

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to NEXUS' })).toBeVisible();
  });
});
