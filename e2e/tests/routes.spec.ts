import { expect, test } from '@playwright/test';

// path -> heading shown by the placeholder page (replaced as real screens land)
const routes: Array<[string, string]> = [
  ['/dashboard', 'Executive dashboard'],
  ['/customers', 'Customers'],
  ['/projects', 'Projects'],
  ['/tasks', 'Tasks'],
  ['/my-day', 'My Day'],
  ['/attendance', 'Attendance'],
  ['/kpi', 'KPI scorecard'],
  ['/deviations', 'Deviation center'],
  ['/chat', 'Project chat'],
  ['/reports', 'Reporting'],
  ['/settings', 'Admin settings'],
  ['/login', 'Sign in'],
  ['/invite', 'Accept invite'],
  ['/reset', 'Reset password'],
  ['/portal', 'Client portal'],
];

for (const [path, heading] of routes) {
  test(`${path} renders "${heading}"`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  });
}

test('/ redirects to the dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('unknown route is a 404', async ({ page }) => {
  const res = await page.goto('/definitely-not-a-page');
  expect(res?.status()).toBe(404);
});
