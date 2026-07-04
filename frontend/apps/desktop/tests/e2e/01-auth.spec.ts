import { test, expect } from '@playwright/test';

test.describe('desktop auth', () => {
  test('login flow desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login');

    await page.fill('[name=email]', 'ana@planta.com');
    await page.fill('[name=password]', 'test1234');
    await page.click('button[type=submit]');
    await page.waitForURL('**/dashboard');

    const session = await page.evaluate(() => localStorage.getItem('superion.auth'));
    expect(session).toContain('accessToken');
    await expect(page.getByTestId('dashboard-placeholder')).toBeVisible();
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });
});
