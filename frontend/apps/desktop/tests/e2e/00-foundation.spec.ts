import { test, expect } from '@playwright/test';

test.describe('desktop foundation', () => {
  test('loads app and redirects to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('exposes mock clients in dev', async ({ page }) => {
    await page.goto('/login');
    const hasSuperion = await page.evaluate(() => Boolean(window.__superion?.api));
    expect(hasSuperion).toBe(true);
  });
});
