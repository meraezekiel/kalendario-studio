import { expect, type Page, test } from '@playwright/test';
import { cleanupUsers, cloudConfigured, newUser, setAccount, signIn, userExists } from './helpers';

test.skip(!cloudConfigured, 'needs the TEST Supabase project (.env.test.local)');
test.afterAll(cleanupUsers);

const WAITING = 'Your account is waiting for approval. You can sign in once it has been approved.';

async function tryToSignIn(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

test('a new account waits until the admin approves it', async ({ page, browser }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ana = await newUser('Ana Waiting', { approved: false });
  await tryToSignIn(page, ana);
  await expect(page.getByRole('status')).toHaveText(WAITING);
  await expect(page).toHaveURL(/\/login/);
  // Not signed in anywhere: the editor offers Sign in.
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Account' })).toHaveCount(0);
  await page.goto('/designs');
  await expect(page).toHaveURL(/\/login\?next=/);

  // The admin sees Ana under Sign-ups and approves her.
  const boss = await newUser('Boss');
  await setAccount(boss.id, { admin: true });
  const ctx = await browser.newContext();
  const adminPage = await ctx.newPage();
  await signIn(adminPage, boss);
  await adminPage.goto('/designs');
  const tab = adminPage.getByRole('tab', { name: /^Sign-ups \(\d+\)$/ });
  await tab.click();
  const row = adminPage.locator(`.request[data-email="${ana.email}"]`);
  await expect(row).toContainText('Ana Waiting');
  await expect(row).toContainText('Signed up just now');
  await adminPage.screenshot({ path: 'e2e/shots/48-sign-ups.png' });
  await row.getByRole('button', { name: 'Approve' }).click();
  await expect(row).toHaveCount(0);
  await ctx.close();

  await tryToSignIn(page, ana);
  await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
  await expect(page).toHaveURL(/\/designs/);
  // Only the admin has the Sign-ups tab.
  await expect(page.getByRole('tab', { name: 'My designs' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Sign-ups/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'New design' }).click();
  await page.waitForURL(/\/d\/[0-9a-f-]{36}$/);
  expect(errors).toEqual([]);
});

test('the admin can decline a sign-up, which removes the account', async ({ page }) => {
  const spam = await newUser('Spammer', { approved: false });
  const boss = await newUser('Boss');
  await setAccount(boss.id, { admin: true });
  await signIn(page, boss);
  await page.goto('/designs');
  await page.getByRole('tab', { name: /^Sign-ups/ }).click();
  const row = page.locator(`.request[data-email="${spam.email}"]`);
  await row.getByRole('button', { name: 'Decline' }).click();
  await expect(row.getByRole('button', { name: 'Click again to decline' })).toBeVisible();
  expect(await userExists(spam.id)).toBe(true);
  await row.getByRole('button', { name: 'Click again to decline' }).click();
  await expect(row).toHaveCount(0);
  await expect.poll(() => userExists(spam.id)).toBe(false);
});
