import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function loginAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/');
  await page.waitForURL('**/login');
  await page.fill('[name=email]', email);
  await page.fill('[name=password]', 'test1234');
  await page.click('button[type=submit]');
  await page.waitForURL(/\/(dashboard|manuals)/);
}

test.describe('desktop polish @a11y', () => {
  test('a11y desktop dashboard', async ({ page }) => {
    await loginAs(page, 'ana@planta.com');
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });

  test('pwa manifest desktop', async ({ page }) => {
    await page.goto('/login');
    const res = await page.request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('service worker registered desktop', async ({ page }) => {
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

  test('telemetría manual_searched', async ({ page }) => {
    const events: Array<{ name: string }> = [];
    await page.exposeFunction('__captureEvent', (event: { name: string }) => {
      events.push(event);
    });
    await page.addInitScript(() => {
      window.__capture = (event: { name: string }) => {
        void (window as unknown as { __captureEvent: (event: { name: string }) => void }).__captureEvent(event);
      };
    });

    await loginAs(page, 'admin@planta.com');
    await page.goto('/manuals');
    await page.locator('[data-testid="manual-row"] a').first().click();
    await page.waitForURL('**/manuals/**');
    await page.fill('[name=search]', 'válvula');
    await expect.poll(() => events.some((event) => event.name === 'manual_searched')).toBe(true);
  });
});
