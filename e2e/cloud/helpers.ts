import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Node side only: the service key never reaches the browser. Vars come from .env.test.local (playwright.config.ts).
const url = process.env.TEST_SUPABASE_URL;
const service = process.env.TEST_SUPABASE_SERVICE_KEY;

/** False when the TEST project isn't configured; cloud specs skip themselves then. */
export const cloudConfigured = !!url && !!process.env.TEST_SUPABASE_ANON_KEY && !!service;

let adminClient: SupabaseClient | null = null;
function admin(): SupabaseClient {
  if (!url || !service) throw new Error('Missing TEST_SUPABASE_URL / TEST_SUPABASE_SERVICE_KEY; see docs/cloud-setup.md');
  adminClient ??= createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return adminClient;
}

export type TestUser = { id: string; email: string; password: string };

const made: TestUser[] = [];

/** A unique throwaway address (never delivered: users are created confirmed). */
export const testEmail = () => `e2e-${randomUUID()}@example.test`;

/** A confirmed throwaway user in the TEST project; removed by `cleanupUsers()`. */
export async function newUser(name?: string): Promise<TestUser> {
  const email = testEmail();
  const password = `pw-${randomUUID()}`;
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { name } : undefined,
  });
  if (error) throw error;
  const user = { id: data.user.id, email, password };
  made.push(user);
  return user;
}

/** Deletes every user this worker made (their designs cascade). Call from `test.afterAll`. */
export async function cleanupUsers() {
  const users = made.splice(0);
  const failed: string[] = [];
  for (const u of users) {
    const { error } = await admin().auth.admin.deleteUser(u.id);
    if (error) failed.push(`${u.email}: ${error.message}`);
  }
  if (failed.length) throw new Error(`Could not delete test users:\n${failed.join('\n')}`);
}

/** Signs in through the /login page and waits for the account avatar. Sign-ins are rate-limited: use sparingly. */
export async function signIn(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
}

/** Creates a design from My designs (the page must be signed in), waits for the editor and returns its id. */
export async function newDesign(page: Page): Promise<string> {
  await page.goto('/designs');
  await page.getByRole('button', { name: 'New design' }).click();
  await page.waitForURL(/\/d\/[0-9a-f-]{36}$/);
  await expect(page.locator('.ph .page')).toBeVisible();
  return page.url().split('/d/')[1];
}
