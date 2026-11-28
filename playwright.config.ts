import { defineConfig, devices } from '@playwright/test';

// The dev server's port. Overridable because 5173 is Vite's default across
// every project on a machine, and a suite that silently talks to whichever one
// answered is worse than a suite that will not start.
const PORT = Number(process.env.E2E_PORT || 5173);
const ORIGIN = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
  use: {
    baseURL: ORIGIN,
    locale: 'vi-VN',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run dev --workspace=nexus-frontend -- --port ${PORT} --strictPort`,
    url: ORIGIN,
    // CI always starts its own. Reuse answers whatever is already on the port,
    // and attaching to an unrelated dev server makes every assertion fail
    // against somebody else's application — a confusing way to learn the port
    // was taken. Locally that trade is still worth it for the speed.
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
