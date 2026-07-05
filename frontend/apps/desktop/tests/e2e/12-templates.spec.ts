import { test, expect } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/');
  await page.waitForURL('**/login');
  await page.fill('[name=email]', email);
  await page.fill('[name=password]', 'test1234');
  await page.click('button[type=submit]');
  await page.waitForURL(/\/(dashboard|manuals|procedures)/);
}

test.describe('desktop procedure templates', () => {
  test('create procedure template', async ({ page }) => {
    await loginAs(page, 'admin@planta.com');
    await page.goto('/procedures');
    await page.getByRole('button', { name: 'Nueva plantilla' }).click();
    await page.fill('[name=name]', 'MP-Compresor-C3');
    await page.fill('[name=version]', '1');
    await page.selectOption('[name=manualId]', {
      label: 'Atlas Copco GA-37 — Service Manual',
    });
    await page.fill('[name=estimatedMinutes]', '90');

    await page.getByRole('button', { name: 'Añadir paso' }).click();
    await page.getByTestId('step-row-0').locator('[name=title]').fill('Preparar área');
    await page.getByRole('button', { name: 'Añadir paso' }).click();
    await page.getByTestId('step-row-1').locator('[name=title]').fill('Aislar energía');
    await page.getByTestId('step-row-1').getByLabel('Crítico').check();
    await page.getByTestId('step-row-1').getByLabel('Requiere foto').check();
    await page.getByTestId('step-row-1').locator('[name=photoCriteria]').fill('Foto del candado');
    await page.getByRole('button', { name: 'Añadir paso' }).click();
    await page.getByTestId('step-row-2').locator('[name=title]').fill('Cerrar V-12');

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('link', { name: 'MP-Compresor-C3', exact: true })).toBeVisible();
  });
});
