import { defineConfig } from '@playwright/test';

// Uses the machine's installed Chrome (no browser download). Run `pnpm build` first.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'chrome',
  },
  webServer: {
    command: 'pnpm --filter @crm/web start',
    url: 'http://localhost:3000/login',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
