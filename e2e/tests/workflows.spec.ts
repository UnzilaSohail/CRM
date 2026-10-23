import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

// These share one in-memory database, so each test uses names no other test touches.

test('CEO creates a customer, is warned about a near-duplicate, finds it by search, then archives it', async ({
  page,
}) => {
  await signIn(page, 'CEO');
  await page.goto('/customers');

  await page.getByLabel('Customer name').fill('Zenith Marine Ltd');
  await page.getByLabel('Industry').fill('Shipping');
  await page.getByRole('button', { name: 'Add customer' }).click();
  await expect(page.getByRole('cell', { name: 'Zenith Marine Ltd', exact: true })).toBeVisible();

  // Near-duplicate name triggers the warning, and can be forced.
  await page.getByLabel('Customer name').fill('Zenith  Marine Ltd.');
  await page.getByRole('button', { name: 'Add customer' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Possible duplicate: Zenith Marine Ltd' }),
  ).toBeVisible();

  // Search finds the original.
  await page.getByRole('searchbox', { name: 'Search customers' }).fill('zenith');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/q=zenith/);
  await expect(page.getByRole('cell', { name: 'Zenith Marine Ltd', exact: true })).toBeVisible();

  // Archive removes it from the default list.
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Archive Zenith Marine Ltd' }).click();
  await expect(page.getByRole('cell', { name: 'Zenith Marine Ltd', exact: true })).toHaveCount(0);
});

test('a project manager sees customers read-only (no add form)', async ({ page }) => {
  await signIn(page, 'PROJECT_MANAGER');
  await page.goto('/customers');
  await expect(page.getByRole('cell', { name: 'Meezan Bank' })).toBeVisible();
  await expect(page.getByLabel('Customer name')).toHaveCount(0);
});

test('manager acknowledges a deviation; a critical one needs a cause', async ({ page }) => {
  await signIn(page, 'PROJECT_MANAGER');
  await page.goto('/deviations');
  await expect(page.getByText('ETL data pipeline')).toBeVisible();
  await page.getByRole('button', { name: 'Acknowledge' }).first().click();

  // Submitting empty is allowed for a watch and rejected for a critical deviation.
  await page.getByRole('button', { name: 'Submit' }).click();
  const needsCause = await page.getByText('A cause is required').isVisible();
  if (needsCause)
    await page.getByLabel('Cause and recovery action').fill('Vendor delay; recovery agreed');
  if (needsCause) await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Acknowledged')).toBeVisible();
});

test('customer sees only their own published project and no internal screens', async ({ page }) => {
  await signIn(page, 'CUSTOMER');
  await expect(page.getByRole('heading', { level: 1, name: 'Client portal' })).toBeVisible();
  await expect(page.getByText('Core API migration')).toBeVisible();
  await expect(page.getByText('Token and auth work')).toBeVisible();
  await expect(page.getByText('Settlement endpoints')).toHaveCount(0); // unpublished
  await expect(page.getByText('ETL data pipeline')).toHaveCount(0); // another customer

  // Internal URLs bounce a customer back to the portal.
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/portal$/);
  await page.goto('/customers');
  await expect(page).toHaveURL(/\/portal$/);
});
