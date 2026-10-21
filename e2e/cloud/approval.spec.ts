import { expect, type Page, test } from '@playwright/test';
import { cleanupUsers, cloudConfigured, newUser, setAccount, signIn, userExists } from './helpers';

test.skip(!cloudConfigured, 'needs the TEST Supabase project (.env.test.local)');
test.afterAll(cleanupUsers);

const WAITING = 'Your account is waiting for approval. You can sign in once it has been approved.';
const DEACTIVATED = 'Your account has been deactivated. Please contact the site owner.';

async function tryToSignIn(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

/** Signs in as a fresh admin and opens the dashboard from the account menu. */
async function openDashboard(page: Page) {
  const boss = await newUser('Boss');
  await setAccount(boss.id, { admin: true });
  await signIn(page, boss);
  // A red dot on the avatar says how many are waiting, without opening anything.
  await expect(page.getByTestId('sign-up-dot')).toHaveText(/^[1-9]\d*$/);
  await page.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('menuitem', { name: /^Accounts \(\d+ waiting\)$/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible();
  return boss;
}

/** The dot on the avatar shows the same number as the dashboard's "n waiting". */
async function dotMatchesDashboard(page: Page) {
  const summary = page.locator('.admin-summary');
  await expect(summary).toHaveText(/\d+ waiting/);
  const n = Number(/(\d+) waiting/.exec((await summary.textContent()) ?? '')![1]);
  if (n) await expect(page.getByTestId('sign-up-dot')).toHaveText(String(n));
  else await expect(page.getByTestId('sign-up-dot')).toHaveCount(0);
}

test('a new account waits until the admin activates it, and can be deactivated again', async ({ page, browser }) => {
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

  // The admin activates Ana from the dashboard.
  const ctx = await browser.newContext();
  const admin = await ctx.newPage();
  const boss = await openDashboard(admin);
  const row = admin.locator(`.account[data-email="${ana.email}"]`);
  await expect(row).toContainText('Ana Waiting');
  await expect(row.locator('.account-status')).toHaveText('Waiting');
  // Her turned-away try still counts as a sign-in.
  await expect(row).toContainText('Signed up just now · Last sign-in just now · 0 designs · 0 MB of photos');
  const me = admin.locator(`.account[data-email="${boss.email}"]`);
  await expect(me.locator('.account-status')).toHaveText('Admin');
  await expect(me.getByRole('button')).toHaveCount(0);
  await admin.screenshot({ path: 'e2e/shots/48-accounts.png' });
  await row.getByRole('button', { name: 'Activate' }).click();
  await expect(row.locator('.account-status')).toHaveText('Active');
  await dotMatchesDashboard(admin);

  await tryToSignIn(page, ana);
  await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
  await expect(page).toHaveURL(/\/designs/);
  // Only the admin has the dashboard, and the dot.
  await expect(page.getByTestId('sign-up-dot')).toHaveCount(0);
  await page.getByRole('button', { name: 'Account' }).click();
  await expect(page.getByRole('menuitem', { name: /Accounts/ })).toHaveCount(0);
  await page.goto('/admin');
  await expect(page.getByText('This page is for the site admin.')).toBeVisible();

  // Deactivated: on her next visit she is signed out and told so.
  await admin.reload();
  await row.getByRole('button', { name: 'Deactivate' }).click();
  await row.getByRole('button', { name: 'Click again to deactivate' }).click();
  await expect(row.locator('.account-status')).toHaveText('Deactivated');
  await page.goto('/designs');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('status')).toHaveText(DEACTIVATED);
  await tryToSignIn(page, ana);
  await expect(page.getByRole('status')).toHaveText(DEACTIVATED);
  // A deactivated account can be activated again, never declined (that would delete its designs).
  await expect(row.getByRole('button', { name: 'Decline' })).toHaveCount(0);
  await row.getByRole('button', { name: 'Activate' }).click();
  await expect(row.locator('.account-status')).toHaveText('Active');
  await ctx.close();
  expect(errors).toEqual([]);
});

test('the admin can decline a sign-up, which removes the account', async ({ page }) => {
  const spam = await newUser('Spammer', { approved: false });
  await openDashboard(page);
  const row = page.locator(`.account[data-email="${spam.email}"]`);
  // Fits a phone: no sideways scrolling, buttons still in reach.
  await page.setViewportSize({ width: 390, height: 800 });
  await expect(row.getByRole('button', { name: 'Decline' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'e2e/shots/49-accounts-phone.png' });
  await page.locator('.top').screenshot({ path: 'e2e/shots/50-sign-up-dot.png' });
  await row.getByRole('button', { name: 'Decline' }).click();
  await expect(row.getByRole('button', { name: 'Click again to decline' })).toBeVisible();
  expect(await userExists(spam.id)).toBe(true);
  await row.getByRole('button', { name: 'Click again to decline' }).click();
  await expect(row).toHaveCount(0);
  await dotMatchesDashboard(page);
  await expect.poll(() => userExists(spam.id)).toBe(false);
});
