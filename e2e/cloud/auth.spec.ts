import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { openStudio } from '../helpers';
import { cleanupUsers, cloudConfigured, newUser, signIn, testEmail } from './helpers';

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
