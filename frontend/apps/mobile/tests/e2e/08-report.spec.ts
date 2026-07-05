import fs from 'node:fs/promises';

import { test, expect } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/');
  await page.waitForURL('**/login');
  await page.fill('[name=email]', email);
  await page.fill('[name=password]', 'test1234');
  await page.click('button[type=submit]');
  await page.waitForURL('**/work-orders');
}

async function uploadAcceptedPhoto(page: import('@playwright/test').Page) {
  await page.getByTestId('mock-camera').setInputFiles({
    name: 'ok.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('Acontenido-de-imagen'),
  });
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByText(/foto aceptada/i)).toBeVisible({ timeout: 3000 });
  await page.waitForURL('**/sessions/**', { timeout: 5000 });
}

async function advanceSeveralSteps(
  page: import('@playwright/test').Page,
  workOrderCode: string,
  count: number,
) {
  await loginAs(page, 'juan@planta.com');
  await page.getByText(workOrderCode).click();
  await page.getByRole('button', { name: 'Iniciar mantenimiento' }).click();
  await page.waitForURL('**/sessions/**');

  let advances = 0;
  while (advances < count) {
    if (page.url().includes('/camera')) {
      await uploadAcceptedPhoto(page);
    }

    await page.getByRole('button', { name: 'Siguiente paso' }).click();
    await page.waitForTimeout(250);
    advances += 1;
  }

  if (page.url().includes('/camera')) {
    await uploadAcceptedPhoto(page);
  }

  await expect(page.getByRole('button', { name: /ver reporte/i })).toBeVisible({
    timeout: 5000,
  });
}

test.describe('mobile report preview and pdf', () => {
  test('report preview and pdf download', async ({ page }) => {
    await advanceSeveralSteps(page, 'OT-1234', 5);
    await page.getByRole('button', { name: /ver reporte/i }).click();
    await page.waitForURL('**/sessions/**/report');

    await expect(page.getByText('Resumen ejecutivo')).toBeVisible();
    await expect(page.getByText(/paso 6 de 12/i)).toBeVisible();
    await expect(page.getByText(/hallazgos/i)).toBeVisible();

    await page.getByRole('button', { name: 'Finalizar' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.getByRole('button', { name: /descargar pdf/i })).toBeVisible({
      timeout: 5000,
    });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /descargar pdf/i }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).not.toBeNull();
    const buf = await fs.readFile(path!);
    expect(buf.subarray(0, 8).toString()).toContain('%PDF-');
  });
});
