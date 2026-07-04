import { test, expect } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/');
  await page.waitForURL('**/login');
  await page.fill('[name=email]', email);
  await page.fill('[name=password]', 'test1234');
  await page.click('button[type=submit]');
  await page.waitForURL('**/work-orders');
}

test.describe('mobile work orders list', () => {
  test('work orders list mobile', async ({ page }) => {
    await loginAs(page, 'juan@planta.com');

    await expect(page.getByText('OT-1234')).toBeVisible();
    await expect(page.getByText('OT-1235')).toBeVisible();

    await page.getByRole('button', { name: 'Pendientes' }).click();
    await expect(page.getByText('OT-1234')).toBeVisible();
    await expect(page.getByText('OT-1237')).not.toBeVisible();

    await page.fill('[name=search]', '1236');
    await expect(page.getByText('OT-1236')).toBeVisible();
    await expect(page.getByText('OT-1234')).not.toBeVisible();
  });
});
