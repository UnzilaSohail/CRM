import { expect, test } from '@playwright/test';
import { EMAIL, PASSWORD, signIn } from './helpers';

test('anonymous visitors are sent to the login page', async ({ page }) => {
  for (const path of ['/dashboard', '/customers', '/portal']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test('wrong password shows an error and stays on the page', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL.CEO);
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid credentials' })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('signing in then out ends the session', async ({ page }) => {
  await signIn(page, 'CEO');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});

test('a tampered session cookie is rejected and sends the user to login', async ({
  page,
  context,
}) => {
  await signIn(page, 'CEO');
  await context.addCookies([{ name: 'crm_session', value: 'x.y', url: 'http://localhost:3000' }]);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?expired=1$/);
  await expect(page.getByRole('status')).toContainText('session expired');
});

test('the session cookie is httpOnly', async ({ page, context }) => {
  await signIn(page, 'CEO');
  const cookie = (await context.cookies()).find((c) => c.name === 'crm_session');
  expect(cookie?.httpOnly).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain('crm_session');
});

test('the sidebar only offers what the role can open', async ({ page }) => {
  await signIn(page, 'EMPLOYEE');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link', { name: 'Tasks' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Customers' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Deviation Center' })).toHaveCount(0);
});

test('an employee who opens a manager page directly sees access denied', async ({ page }) => {
  await signIn(page, 'EMPLOYEE');
  await page.goto('/deviations');
  await expect(page.getByRole('alert').filter({ hasText: 'Access denied' })).toBeVisible();
  await page.goto('/customers');
  await expect(page.getByRole('alert').filter({ hasText: 'Access denied' })).toBeVisible();
});

test('password is required', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL.CEO);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Enter your email and password' }),
  ).toBeVisible();
  expect(PASSWORD.length).toBeGreaterThan(0);
});
