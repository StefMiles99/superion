import { test, expect } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/');
  await page.waitForURL('**/login');
  await page.fill('[name=email]', email);
  await page.fill('[name=password]', 'test1234');
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard');
}

test.describe('desktop dashboard', () => {
  test('dashboard live update', async ({ page }) => {
    await loginAs(page, 'ana@planta.com');
    await expect(page.getByTestId('sessions-table')).toBeVisible();
    const initialRows = await page.getByTestId('session-row').count();

    await page.evaluate(() => {
      window.__mockWs?.emit({
        type: 'session.started',
        seq: 100,
        session_id: 'new-sess',
        created_at: new Date().toISOString(),
        payload: {
          session_id: 'new-sess',
          work_order_id: 'wo-9999',
          started_at: new Date().toISOString(),
        },
      });
    });

    await expect(page.getByTestId('session-row')).toHaveCount(initialRows + 1);
    await expect(page.getByText('OT-9999')).toBeVisible();

    await page.getByTestId('session-row').first().getByRole('button', { name: 'Acciones' }).click();
    await page.getByRole('menuitem', { name: 'Pausar' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByRole('status').filter({ hasText: /sesión .* pausada/i })).toBeVisible();
  });
});
