import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['apps/**/tests/e2e/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile',
      testMatch: 'apps/mobile/tests/e2e/**/*.spec.ts',
      use: {
        ...devices['Pixel 5'],
        baseURL: 'http://localhost:5173',
      },
    },
    {
      name: 'desktop',
      testMatch: 'apps/desktop/tests/e2e/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5174',
      },
    },
  ],
  webServer: [
    {
      command: 'corepack pnpm --filter @superion/mobile dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'corepack pnpm --filter @superion/desktop dev',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
