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

/** A confirmed throwaway user in the TEST project, approved unless told otherwise; removed by `cleanupUsers()`. */
export async function newUser(name?: string, { approved = true } = {}): Promise<TestUser> {
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
  if (approved) await setAccount(user.id, { approved_at: new Date().toISOString() });
  return user;
}

/** Changes a user's row in public.accounts (approval, admin). */
export async function setAccount(id: string, fields: { approved_at?: string | null; admin?: boolean }) {
  const { error } = await admin().from('accounts').update(fields).eq('user_id', id);
  if (error) throw error;
}

/** Whether a user still exists in the TEST project. */
export async function userExists(id: string): Promise<boolean> {
  const { data } = await admin().auth.admin.getUserById(id);
  return !!data.user;
}

/** Deletes every user this worker made (their designs cascade). Call from `test.afterAll`. */
export async function cleanupUsers() {
  const users = made.splice(0);
  const failed: string[] = [];
  for (const u of users) {
    const { error } = await admin().auth.admin.deleteUser(u.id);
    if (error && error.status !== 404) failed.push(`${u.email}: ${error.message}`); // 404: a test deleted it
  }
  if (failed.length) throw new Error(`Could not delete test users:\n${failed.join('\n')}`);
}

/**
 * Makes `userId` use `bytes` of photo space without storing anything: a design they own plus photos
 * rows (at most 5 MB each) with no files. Their rows go when the user is deleted.
 */
export async function seedPhotoUsage(userId: string, bytes: number) {
  const { data, error } = await admin().from('designs').insert({ owner: userId, name: 'Seeded photos' }).select('id').single();
  if (error) throw error;
  const rows: { path: string; design_id: string; bytes: number }[] = [];
  for (let left = bytes; left > 0; left -= 5242880) {
    rows.push({ path: `${data.id}/seed-${randomUUID()}.jpg`, design_id: data.id, bytes: Math.min(left, 5242880) });
  }
  const res = await admin().from('photos').insert(rows);
  if (res.error) throw res.error;
}

/** Names of the designs `userId` owns. */
export async function designNames(userId: string): Promise<string[]> {
  const { data, error } = await admin().from('designs').select('name').eq('owner', userId);
  if (error) throw error;
  return (data ?? []).map((d) => d.name as string);
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

/** A user with `email` that has not confirmed it yet (so it can't sign in); removed by `cleanupUsers()`. */
export async function newUnconfirmedUser(email: string): Promise<TestUser> {
  const password = `pw-${randomUUID()}`;
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: false });
  if (error) throw error;
  const user = { id: data.user.id, email, password };
  made.push(user);
  return user;
}

/** Confirms a user's email, as following the confirmation link would. */
export async function confirmUser(id: string) {
  const { error } = await admin().auth.admin.updateUserById(id, { email_confirm: true });
  if (error) throw error;
}

/** The user ids linked to the invitations of design `designId`, by email. */
export async function memberLinks(designId: string): Promise<Record<string, string | null>> {
  const { data, error } = await admin().from('design_members').select('email, user_id').eq('design_id', designId);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((m) => [m.email as string, (m.user_id as string | null) ?? null]));
}

/** Deletes every Print Kit product, with its picture (the TEST project's products are all made by tests). */
export async function deleteAllProducts() {
  const { data } = await admin().from('products').select('id, image');
  const pics = (data ?? []).map((p) => p.image).filter(Boolean) as string[];
  if (pics.length) await admin().storage.from('products').remove(pics);
  if (data?.length) await admin().from('products').delete().in('id', data.map((p) => p.id));
}

/** Clears every usage count (the TEST project's stats all come from tests). */
export async function deleteAllStats() {
  await admin().from('stats').delete().gte('n', 0);
}
