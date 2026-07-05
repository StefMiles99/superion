import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

test.describe('mobile polish @a11y', () => {
  test('a11y mobile work orders', async ({ page }) => {
    await loginAs(page, 'juan@planta.com');
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });

  test('pwa manifest mobile', async ({ page }) => {
    await page.goto('/login');
    const res = await page.request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('service worker registered mobile', async ({ page }) => {
    await page.goto('/login');
    const registered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return false;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      return Boolean(registration);
    });
    expect(registered).toBe(true);
  });

  test('telemetría session_started', async ({ page }) => {
    const events: Array<{ name: string }> = [];
    await page.exposeFunction('__captureEvent', (event: { name: string }) => {
      events.push(event);
    });
    await page.addInitScript(() => {
      window.__capture = (event: { name: string }) => {
        void (window as unknown as { __captureEvent: (event: { name: string }) => void }).__captureEvent(event);
      };
    });

    await loginAs(page, 'juan@planta.com');
    await startSession(page, 'OT-1234');
    await expect.poll(() => events.some((event) => event.name === 'session_started')).toBe(true);
  });
});
