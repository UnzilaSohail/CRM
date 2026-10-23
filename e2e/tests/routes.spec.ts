import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

// path -> level-1 heading of each screen (matched case-insensitively as a substring)
const authedRoutes: Array<[string, string]> = [
  ['/dashboard', 'Good morning'],
  ['/customers', 'Customers'],
  ['/projects', 'Projects'],
  ['/tasks', 'Tasks'],
  ['/my-day', 'My Day'],
  ['/attendance', 'Attendance'],
  ['/kpi', 'KPI scorecard'],
  ['/deviations', 'Deviation center'],
  ['/chat', 'Messages'],
  ['/reports', 'Reports'],
  ['/settings', 'Settings'],
];

const publicRoutes: Array<[string, string]> = [
  ['/login', 'Sign in'],
  ['/invite', 'Accept invite'],
  ['/reset', 'Reset password'],
];

for (const [path, heading] of publicRoutes) {
  test(`${path} renders "${heading}" without a session`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  });
}

test.describe('signed in as CEO', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'CEO');
  });

  for (const [path, heading] of authedRoutes) {
    test(`${path} renders "${heading}"`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    });
  }

  test('project detail opens from the list', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('link', { name: 'Core API migration' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Core API migration' })).toBeVisible();
    await expect(page.getByText('Milestones (weighted)')).toBeVisible();
    await expect(page.getByText('Settlement endpoints')).toBeVisible(); // internal view shows unpublished
  });

  test('unknown project id is a 404 page', async ({ page }) => {
    const res = await page.goto('/projects/99999999-9999-4999-8999-999999999999');
    expect(res?.status()).toBe(404);
  });

  test('/ redirects to the dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard$/);
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
});

test('unknown route is a 404', async ({ page }) => {
  await signIn(page, 'CEO');
  const res = await page.goto('/definitely-not-a-page');
  expect(res?.status()).toBe(404);
});
