import { test, expect } from '@playwright/test';

test.describe('desktop foundation', () => {
  test('loads placeholder page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('foundation-placeholder')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SUPERION' })).toBeVisible();
    await expect(page.getByText(/supervisores/i)).toBeVisible();
  });

  test('exposes mock clients in dev', async ({ page }) => {
    await page.goto('/');
    const hasSuperion = await page.evaluate(() => Boolean(window.__superion?.api));
    expect(hasSuperion).toBe(true);
  });
});
