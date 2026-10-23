import { expect, test } from '@playwright/test';

// path -> level-1 heading of each screen (matched case-insensitively as a substring)
const routes: Array<[string, string]> = [
  ['/dashboard', 'Good morning'],
  ['/customers', 'Customers'],
  ['/projects', 'Projects'],
  ['/projects/p1', 'Core API migration'],
  ['/tasks', 'Tasks'],
  ['/my-day', 'My Day'],
  ['/attendance', 'Attendance'],
  ['/kpi', 'KPI scorecard'],
  ['/deviations', 'Deviation center'],
  ['/chat', 'Messages'],
  ['/reports', 'Reports'],
  ['/settings', 'Settings'],
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

test('Kanban status menu moves a task between columns', async ({ page }) => {
  await page.goto('/tasks');
  const todo = page.getByRole('region', { name: 'To Do' });
  await expect(todo.getByText('Security review')).toBeVisible();
  await todo.getByLabel('Status of Security review').selectOption('In Progress');
  await expect(
    page.getByRole('region', { name: 'In Progress' }).getByText('Security review'),
  ).toBeVisible();
});
