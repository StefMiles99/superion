import { defineConfig, devices } from "@playwright/test";

// E2E sobre la app en modo mock (sin backend). Requiere: pnpm exec playwright install
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    ...devices["iPhone 13"],
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
