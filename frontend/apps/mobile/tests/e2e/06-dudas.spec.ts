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
  await page.getByText(workOrderCode).click();
  await page.getByRole('button', { name: 'Iniciar mantenimiento' }).click();
  await page.waitForURL('**/sessions/**');
}

test.describe('mobile assistant dudas', () => {
  test('ask assistant with citation', async ({ page }) => {
    await loginAs(page, 'juan@planta.com');
    await startSession(page, 'OT-1234');

    await page.getByRole('button', { name: /tengo una duda/i }).click();
    await page.fill('[name=question]', '¿cuál es el torque?');
    await page.getByRole('button', { name: 'Enviar' }).click();

    await expect(page.getByText(/torque/i)).toBeVisible();
    await expect(page.getByText(/p\. 42/)).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar' }).click();
    await page.getByRole('button', { name: /ver historial/i }).click();
    await expect(page.getByText('¿cuál es el torque?')).toBeVisible();
  });
});
