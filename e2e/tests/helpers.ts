import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Passw0rd!demo';

export const EMAIL = {
  CEO: 'ceo@ainetworks.test',
  PROJECT_MANAGER: 'project.manager@ainetworks.test',
  EMPLOYEE: 'employee@ainetworks.test',
  CUSTOMER: 'customer@ainetworks.test',
} as const;

/** Signs in through the real login form and waits for the landing page. */
export async function signIn(page: Page, role: keyof typeof EMAIL) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL[role]);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(role === 'CUSTOMER' ? /\/portal$/ : /\/dashboard$/);
}
