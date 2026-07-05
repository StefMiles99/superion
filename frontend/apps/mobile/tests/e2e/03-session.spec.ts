import { test, expect } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/');
  await page.waitForURL('**/login');
  await page.fill('[name=email]', email);
  await page.fill('[name=password]', 'test1234');
  await page.click('button[type=submit]');
  await page.waitForURL('**/work-orders');
}

test.describe('mobile session flow', () => {
  test('session flow mobile', async ({ page }) => {
    await loginAs(page, 'juan@planta.com');
    await page.getByText('OT-1234').click();
    await page.getByRole('button', { name: 'Iniciar mantenimiento' }).click();
    await page.waitForURL('**/sessions/**');
    await expect(page.getByText('Paso 1 de 12')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Siguiente paso' })).toBeEnabled();

    for (let step = 0; step < 3; step += 1) {
      await page.getByRole('button', { name: 'Siguiente paso' }).click();
    }

    await expect(page.getByText('Paso 4 de 12')).toBeVisible();
    await page.getByRole('button', { name: 'Siguiente paso' }).click();
    await page.waitForURL('**/sessions/**/camera');
    await expect(page.getByText(/sensor visible/i)).toBeVisible();
  });
});
