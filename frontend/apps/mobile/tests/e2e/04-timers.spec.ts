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

test.describe('mobile timers and stepper', () => {
  test('timers and stepper', async ({ page }) => {
    await loginAs(page, 'juan@planta.com');
    await startSession(page, 'OT-1234');

    await expect(page.getByTestId('total-timer')).toHaveText(/00:0[0-9]/);
    await page.waitForTimeout(2200);
    await expect(page.getByTestId('total-timer')).toHaveText(/00:0[2-9]/);
    await expect(page.getByTestId('eta')).toContainText(/ETA \d+m/);
    await expect(page.getByTestId('stepper')).toBeVisible();
  });
});
