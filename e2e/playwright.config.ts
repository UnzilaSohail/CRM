import { defineConfig } from '@playwright/test';

// Uses the machine's installed Chrome (no browser download). Run `pnpm build` first.
// The API runs against an in-memory seeded database, so no Docker or Postgres is needed.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'chrome',
  },
  webServer: [
    {
      command: 'pnpm --filter @crm/api dev:memory',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @crm/web start',
      url: 'http://localhost:3000/login',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { API_URL: 'http://localhost:3001', COOKIE_INSECURE: '1' },
    },
  ],
});
