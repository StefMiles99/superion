import { test, expect } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/');
  await page.waitForURL('**/login');
  await page.fill('[name=email]', email);
  await page.fill('[name=password]', 'test1234');
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard');
}

test.describe('desktop session detail', () => {
  test('session detail live', async ({ page }) => {
    await loginAs(page, 'ana@planta.com');
    await expect(page.getByTestId('sessions-table')).toBeVisible();

    const firstRow = page.getByTestId('session-row').first();
    await firstRow.click();
    await page.waitForURL('**/sessions/**');
    await expect(page.getByTestId('report-viewer')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('tab', { name: 'Procedimiento' }).click();
    await expect(page.getByTestId('report-step-0')).toBeVisible();

    const sessionId = page.url().split('/sessions/')[1] ?? '';

    await page.evaluate(
      ({ sid }) => {
        window.__mockWs?.emit({
          type: 'event.appended',
          seq: 50,
          session_id: sid,
          created_at: new Date().toISOString(),
          payload: { type: 'utterance', step_index: 0, text: 'ya cerré la válvula' },
        });
      },
      { sid: sessionId },
    );

    await expect(page.getByText(/ya cerré la válvula/i)).toBeVisible();

    await page.getByRole('button', { name: 'Pausar remoto' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByRole('status').filter({ hasText: /sesión .* pausada/i })).toBeVisible();
  });
});
