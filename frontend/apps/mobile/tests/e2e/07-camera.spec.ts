import { test, expect } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/');
  await page.waitForURL('**/login');
  await page.fill('[name=email]', email);
  await page.fill('[name=password]', 'test1234');
  await page.click('button[type=submit]');
  await page.waitForURL('**/work-orders');
}

async function startSessionWithPhotoRequired(
  page: import('@playwright/test').Page,
  workOrderCode: string,
) {
  await loginAs(page, 'juan@planta.com');
  await page.getByText(workOrderCode).click();
  await page.getByRole('button', { name: 'Iniciar mantenimiento' }).click();
  await page.waitForURL('**/sessions/**');

  for (let step = 0; step < 3; step += 1) {
    await page.getByRole('button', { name: 'Siguiente paso' }).click();
    await page.waitForTimeout(200);
  }

  await page.waitForURL('**/sessions/**/camera');
}

test.describe('mobile camera photo flow', () => {
  test('photo accepted', async ({ page }) => {
    await startSessionWithPhotoRequired(page, 'OT-1234');

    await page.getByTestId('mock-camera').setInputFiles({
      name: 'ok.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('Acontenido-de-imagen'),
    });
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText(/validando/i)).toBeVisible();
    await expect(page.getByText(/foto aceptada/i)).toBeVisible({ timeout: 3000 });
    await page.waitForURL('**/sessions/**', { timeout: 5000 });
    await expect(page.getByText('Paso 4 de 12')).toBeVisible();

    await page.getByRole('button', { name: 'Siguiente paso' }).click();
    await expect(page.getByText('Paso 5 de 12')).toBeVisible();
  });

  test('photo rejected then accepted', async ({ page }) => {
    await startSessionWithPhotoRequired(page, 'OT-1234');

    for (let i = 0; i < 2; i += 1) {
      await page.getByTestId('mock-camera').setInputFiles({
        name: 'bad.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('Rmal'),
      });
      await page.getByRole('button', { name: 'Enviar' }).click();
      await expect(page.getByText(/acércate más/i)).toBeVisible();
      await page.getByRole('button', { name: 'Re-tomar' }).click();
    }

    await page.getByTestId('mock-camera').setInputFiles({
      name: 'ok.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('Aok'),
    });
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText(/foto aceptada/i)).toBeVisible();
  });

  test('photo rejected 3 times shows escalation', async ({ page }) => {
    await startSessionWithPhotoRequired(page, 'OT-1234');

    for (let i = 0; i < 2; i += 1) {
      await page.getByTestId('mock-camera').setInputFiles({
        name: 'bad.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('Rbad'),
      });
      await page.getByRole('button', { name: 'Enviar' }).click();
      await expect(page.getByText(/acércate más/i)).toBeVisible();
      await page.getByRole('button', { name: 'Re-tomar' }).click();
    }

    await page.getByTestId('mock-camera').setInputFiles({
      name: 'bad.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('Rbad'),
    });
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText(/máximo de reintentos/i)).toBeVisible();
  });
});
