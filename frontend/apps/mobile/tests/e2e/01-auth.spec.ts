import { test, expect } from '@playwright/test';

test.describe('mobile auth', () => {
  test('login flow mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login');

    await page.fill('[name=email]', 'juan@planta.com');
    await page.fill('[name=password]', 'test1234');
    await page.click('button[type=submit]');
    await page.waitForURL('**/work-orders');

    const session = await page.evaluate(() => localStorage.getItem('superion.auth'));
    expect(session).toContain('accessToken');
    await expect(page.getByTestId('work-orders-placeholder')).toBeVisible();
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/work-orders');
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });
});
