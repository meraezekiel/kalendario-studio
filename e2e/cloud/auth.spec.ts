import { randomUUID } from 'node:crypto';
import { expect, type Page, test } from '@playwright/test';
import { openStudio } from '../helpers';
import { cleanupUsers, cloudConfigured, newDesign, newUser, signIn, testEmail } from './helpers';

test.skip(!cloudConfigured, 'needs the TEST Supabase project (.env.test.local)');
test.afterAll(cleanupUsers);

test('sign up shows "Check your email" and does not sign in', async ({ page }) => {
  // The TEST project can't deliver mail (and its mail quota is tiny), so answer sign-up the way Supabase
  // does when email confirmation is on: the new user, unconfirmed, with no session.
  const email = testEmail();
  let sent: { url: string; body: Record<string, unknown> } | null = null;
  await page.route('**/auth/v1/signup**', async (route) => {
    sent = { url: route.request().url(), body: route.request().postDataJSON() };
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: randomUUID(),
        aud: 'authenticated',
        role: '',
        email,
        phone: '',
        confirmation_sent_at: now,
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { name: 'Ana' },
        identities: [],
        created_at: now,
        updated_at: now,
        is_anonymous: false,
      }),
    });
  });
  await page.goto('/login');
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Name').fill('Ana');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('a-long-password-123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('Check your email')).toBeVisible();
  expect(sent).not.toBeNull();
  expect(sent!.body).toMatchObject({ email, password: 'a-long-password-123', data: { name: 'Ana' } });
  expect(decodeURIComponent(sent!.url)).toContain('redirect_to=http://localhost:3101/auth/callback');

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Account' })).toHaveCount(0);
});

test('an email link opened in another browser says the email may already be confirmed', async ({ page }) => {
  const errors = watchErrors(page);
  // A fresh browser holds no PKCE verifier, as when the confirmation email is opened on another device.
  await page.goto(`/auth/callback?code=${randomUUID()}`);
  const card = page.locator('.auth-card');
  await expect(card.getByRole('alert')).toHaveText(
    'Your email may already be confirmed. If you signed up in another browser, sign in here or there. A password reset link only works in the browser where you asked for it.',
  );
  await expect(card).not.toContainText('expired');
  await card.getByRole('link', { name: 'Go to sign in' }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(errors).toEqual([]);
});

test('confirmed user signs in and sees their email in the account menu', async ({ page }) => {
  const user = await newUser();
  await signIn(page, user);
  await page.getByRole('button', { name: 'Account' }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toContainText(user.email);
  await expect(menu.getByRole('menuitem', { name: 'My designs' })).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test(`wrong password shows "That email and password don't match."`, async ({ page }) => {
  const user = await newUser();
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.auth-card').getByRole('alert')).toHaveText("That email and password don't match.");
  await expect(page).toHaveURL(/\/login/);
});

test('signed-out top bar shows "Sign in" and the editor still works', async ({ page }) => {
  const supabaseHost = new URL(process.env.TEST_SUPABASE_URL!).host;
  const calls: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).host === supabaseHost) calls.push(r.url());
  });
  const errors = await openStudio(page);
  await expect(page.locator('header.top').getByRole('link', { name: 'Sign in' })).toBeVisible();
  await page.locator('.ph .tx', { hasText: 'Our Family 2027' }).click();
  await expect(page.getByTestId('insp-title')).toHaveText('Caption');
  expect(calls).toEqual([]);
  expect(errors).toEqual([]);
});

/** Names of this origin's offline design copies (y-indexeddb databases). */
const designDbs = (page: Page) =>
  page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name ?? '').filter((n) => n.startsWith('kal-design-')));

async function addHeading(page: Page, text: string) {
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Add a heading' }).click();
  await page.locator('.insp textarea').fill(text);
  await expect(page.locator('.ph .tx', { hasText: text })).toBeVisible();
}

/** Records runtime errors, ignoring failed requests (Supabase unreachable, external fonts). */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource|ERR_INTERNET_DISCONNECTED|WebSocket|fonts\.(googleapis|gstatic)/.test(m.text())) return;
    errors.push(m.text());
  });
  return errors;
}

async function startSignOut(page: Page) {
  await page.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('menu').getByRole('menuitem', { name: 'Sign out' }).click();
}

test('sign out with unsynced changes asks first; Sign out anyway clears local design cache', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  const user = await newUser();
  await signIn(page, user);
  const id = await newDesign(page);
  await expect(page.getByTestId('sync-state')).toHaveText('Saved');
  await expect.poll(() => designDbs(page)).toContain(`kal-design-${id}`);
  expect(await page.evaluate(() => localStorage.getItem('kal-design-dbs'))).toContain(id);

  // Supabase unreachable (the app itself still loads): edits can't be sent, nor can the sign-out.
  // (Fully offline, the dev server couldn't serve / either.)
  await page.route('**/rest/v1/design_updates**', (r) => r.abort('internetdisconnected'));
  await page.route('**/auth/v1/logout**', (r) => r.abort('internetdisconnected'));
  await addHeading(page, 'Not synced yet');
  await expect(page.getByTestId('sync-state')).not.toHaveText('Saved');
  await startSignOut(page);
  const dlg = page.getByRole('dialog', { name: "Some changes haven't synced yet." });
  await expect(dlg).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/d/${id}$`));
  await dlg.getByRole('button', { name: 'Sign out anyway' }).click();

  await expect(page).toHaveURL(/localhost:3101\/$/);
  await expect(page.locator('header.top').getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect.poll(() => designDbs(page), { timeout: 10_000 }).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('kal-design-dbs'))).toBeNull();
  // Signed out for good: a reload doesn't bring the session back.
  await page.reload();
  await expect(page.locator('header.top').getByRole('link', { name: 'Sign in' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('sign out when synced goes straight to /', async ({ page }) => {
  const errors = watchErrors(page);
  const user = await newUser();
  await signIn(page, user);
  const id = await newDesign(page);
  await addHeading(page, 'All saved');
  await expect(page.getByTestId('sync-state')).toHaveText('Saved', { timeout: 15_000 });
  await startSignOut(page);
  await expect(page).toHaveURL(/localhost:3101\/$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('header.top').getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect.poll(() => designDbs(page), { timeout: 10_000 }).not.toContain(`kal-design-${id}`);
  expect(errors).toEqual([]);
});

test('Wait while offline gives up after a while and offers Sign out anyway again', async ({ page, context }) => {
  test.setTimeout(90_000);
  const user = await newUser();
  await signIn(page, user);
  const id = await newDesign(page);
  await expect(page.getByTestId('sync-state')).toHaveText('Saved');

  await context.setOffline(true);
  await addHeading(page, 'Still offline');
  await startSignOut(page);
  const dlg = page.getByRole('dialog', { name: "Some changes haven't synced yet." });
  await dlg.getByRole('button', { name: 'Wait' }).click();
  await expect(dlg).toContainText('Saving your changes…');
  await expect(dlg.getByRole('button', { name: 'Sign out anyway' })).toHaveCount(0);
  await expect(dlg).toContainText("We couldn't save your changes.", { timeout: 25_000 });
  await expect(dlg.getByRole('button', { name: 'Sign out anyway' })).toBeVisible();
  await dlg.getByRole('button', { name: 'Keep editing' }).click();
  await expect(dlg).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/d/${id}$`));
  await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
  await context.setOffline(false);
});

test('Wait saves unsynced changes once back online, then signs out', async ({ page, context }) => {
  test.setTimeout(90_000);
  const user = await newUser();
  await signIn(page, user);
  const id = await newDesign(page);
  await expect(page.getByTestId('sync-state')).toHaveText('Saved');

  await context.setOffline(true);
  await addHeading(page, 'Saved while waiting');
  await expect(page.getByTestId('sync-state')).toHaveText('Offline, changes kept on this computer', { timeout: 15_000 });
  await startSignOut(page);
  const dlg = page.getByRole('dialog', { name: "Some changes haven't synced yet." });
  await dlg.getByRole('button', { name: 'Wait' }).click();
  await expect(dlg).toContainText('Saving your changes…');
  await context.setOffline(false);
  await expect(page).toHaveURL(/localhost:3101\/$/, { timeout: 30_000 });

  // The edit reached the account: signing back in shows it.
  await signIn(page, user);
  await page.goto(`/d/${id}`);
  await expect(page.locator('.ph .tx', { hasText: 'Saved while waiting' })).toBeVisible({ timeout: 15_000 });
});
