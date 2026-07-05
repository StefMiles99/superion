import { test, expect } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/');
  await page.waitForURL('**/login');
  await page.fill('[name=email]', email);
  await page.fill('[name=password]', 'test1234');
  await page.click('button[type=submit]');
  await page.waitForURL(/\/(dashboard|manuals)/);
}

test.describe('desktop manuals RAG', () => {
  test('manual upload and search', async ({ page }) => {
    await loginAs(page, 'admin@planta.com');
    await page.goto('/manuals');
    await page.getByRole('button', { name: 'Subir manual' }).click();

    await page.getByTestId('dropzone').locator('input[type="file"]').setInputFiles({
      name: 'manual.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Pagina 1\n\fPagina 2\n\fPagina 3'),
    });

    await page.fill('[name=title]', 'Atlas Copco GA-37');
    await page.fill('[name=assetModel]', 'Atlas Copco GA-37');
    await page.getByRole('button', { name: 'Subir' }).click();

    await expect(page.getByText(/indexando/i)).toBeVisible();
    await expect(page.getByText(/indexado/i)).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Ver manual' }).click();
    await page.fill('[name=search]', 'pagina');
    await expect(page.getByText('Pagina 1')).toBeVisible();
  });
});
