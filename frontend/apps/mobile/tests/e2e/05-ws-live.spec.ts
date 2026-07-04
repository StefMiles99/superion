import { test, expect } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/');
  await page.waitForURL('**/login');
  await page.fill('[name=email]', email);
  await page.fill('[name=password]', 'test1234');
  await page.click('button[type=submit]');
  await page.waitForURL('**/work-orders');
}

async function startSession(page: import('@playwright/test').Page, workOrderCode: string) {
  await loginAs(page, 'juan@planta.com');
  await page.getByText(workOrderCode).click();
  await page.getByRole('button', { name: 'Iniciar mantenimiento' }).click();
  await page.waitForURL('**/sessions/**');
}

test.describe('mobile ws live updates', () => {
  test('ws live update step', async ({ page }) => {
    await startSession(page, 'OT-1234');
    await expect(page.getByText('Paso 1 de 12')).toBeVisible();

    const sessionId = page.url().split('/').pop()!;

    await page.evaluate(
      ({ id }) => {
        window.__mockWs?.emit({
          type: 'step.entered',
          seq: 99,
          session_id: id,
          created_at: new Date().toISOString(),
          payload: {
            index: 1,
            title: 'Aislar energía',
            description: 'Cerrar V-12',
            estimated_minutes: 10,
            critical: true,
            requires_photo: false,
            photo_criteria: null,
          },
        });
      },
      { id: sessionId },
    );

    await expect(page.getByText('Paso 2 de 12')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Aislar energía' })).toBeVisible();

    await page.evaluate(() => {
      void window.__mockWs?.disconnect();
    });

    await expect(page.getByTestId('connection-banner')).toBeVisible();
  });
});
