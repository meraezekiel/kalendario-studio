import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { cleanupUsers, cloudConfigured, newDesign, newUser, signIn, type TestUser } from './helpers';

test.skip(!cloudConfigured, 'needs the TEST Supabase project (.env.test.local)');
// One worker, in order: each user signs in once (sign-in is rate-limited) and later tests reuse the session.
test.describe.configure({ mode: 'default' });
test.afterAll(cleanupUsers);

type State = Awaited<ReturnType<BrowserContext['storageState']>>;

let owner: TestUser;
let ownerState: State;
let strangerState: State;

/** Signs a user in once in a throwaway context and returns its storage (the session lives in localStorage). */
async function sessionFor(browser: Browser, user: TestUser): Promise<State> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, user);
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  owner = await newUser('Owner');
  const stranger = await newUser('Stranger');
  ownerState = await sessionFor(browser, owner);
  strangerState = await sessionFor(browser, stranger);
});

/** Records runtime errors, ignoring network failures (expected offline and from external fonts). */
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

async function openDesign(page: Page, id: string) {
  await page.goto(`/d/${id}`);
  await expect(page.locator('.ph .page')).toBeVisible();
}

async function addHeading(page: Page, text: string) {
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Add a heading' }).click();
  await page.locator('.insp textarea').fill(text);
  await expect(page.locator('.ph .tx', { hasText: text })).toBeVisible();
}

const syncState = (page: Page) => page.getByTestId('sync-state');

test('new design opens in the editor and appears in My designs after going back', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: ownerState });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  const id = await newDesign(page);
  await expect(page).toHaveURL(new RegExp(`/d/${id}$`));
  await expect(syncState(page)).toHaveText('Saved');
  await page.getByRole('link', { name: 'My designs' }).click();
  await expect(page).toHaveURL(/\/designs$/);
  const card = page.locator(`[data-design-id="${id}"]`);
  await expect(card).toBeVisible();
  await expect(card).toContainText('Untitled calendar');
  await expect(card).toContainText('Edited');
  await page.getByRole('tab', { name: 'Shared with me' }).click();
  await expect(page.getByText('Nothing has been shared with you yet.')).toBeVisible();
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0); // (Next's route announcer is an alert too)
  await page.getByRole('tab', { name: 'My designs' }).click();
  expect(errors).toEqual([]);

  // After an edit, leaving the editor saves a thumbnail of the first page.
  await card.getByRole('link', { name: 'Untitled calendar', exact: true }).click();
  await expect(page.locator('.ph .page')).toBeVisible();
  await addHeading(page, 'Thumb me');
  const thumbSaved = page.waitForResponse((r) => r.url().includes('/rest/v1/designs') && r.request().method() === 'PATCH');
  await page.getByRole('link', { name: 'My designs' }).click();
  expect((await thumbSaved).ok()).toBe(true);
  await page.reload();
  await expect(card.locator('img')).toHaveAttribute('src', /^data:image\/jpeg/);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('edit on one computer shows on another', async ({ browser }) => {
  const a = await browser.newContext({ storageState: ownerState });
  const b = await browser.newContext({ storageState: ownerState });
  const pa = await a.newPage();
  const pb = await b.newPage();
  const errors = [...watchErrors(pa), ...watchErrors(pb)];
  const id = await newDesign(pa);
  await addHeading(pa, 'Hello from A');
  await expect(syncState(pa)).toHaveText('Saved');

  await openDesign(pb, id);
  await expect(pb.locator('.ph .tx', { hasText: 'Hello from A' })).toBeVisible();

  // A's next change arrives on B without reloading.
  await pa.locator('.insp textarea').fill('Second edit from A');
  await expect(pb.locator('.ph .tx', { hasText: 'Second edit from A' })).toBeVisible({ timeout: 5000 });
  expect(errors).toEqual([]);
  await a.close();
  await b.close();
});

test('two tabs in the same context both stay in sync', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: ownerState });
  const t1 = await ctx.newPage();
  const t2 = await ctx.newPage();
  const id = await newDesign(t1);
  await openDesign(t2, id);

  await addHeading(t1, 'Tab one wrote this');
  await expect(t2.locator('.ph .tx', { hasText: 'Tab one wrote this' })).toBeVisible({ timeout: 5000 });

  await addHeading(t2, 'Tab two wrote this');
  await expect(t1.locator('.ph .tx', { hasText: 'Tab two wrote this' })).toBeVisible({ timeout: 5000 });
  await expect(t1.locator('.ph .tx', { hasText: 'Tab one wrote this' })).toBeVisible();

  // Both survive a reload of either tab (the shared offline copy doesn't lose anything).
  await t2.reload();
  await expect(t2.locator('.ph .tx', { hasText: 'Tab one wrote this' })).toBeVisible();
  await expect(t2.locator('.ph .tx', { hasText: 'Tab two wrote this' })).toBeVisible();
  await ctx.close();
});

test('rename and delete from My designs', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: ownerState });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  const id = await newDesign(page);
  await page.goto('/designs');
  const card = page.locator(`[data-design-id="${id}"]`);
  await card.getByRole('button', { name: 'Rename' }).click();
  const input = card.getByLabel('Design name');
  await input.fill('Family 2027');
  const saved = page.waitForResponse((r) => r.url().includes('/rest/v1/designs') && r.request().method() === 'PATCH');
  await input.press('Enter');
  await expect(card).toContainText('Family 2027');
  expect((await saved).ok()).toBe(true);
  await page.reload();
  await expect(card).toContainText('Family 2027');

  await card.getByRole('button', { name: 'Delete' }).click();
  await card.getByRole('button', { name: 'Click again to delete' }).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'New design' })).toBeVisible();
  await expect(card).toHaveCount(0);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('signed-out visit to /d/<id> goes to /login and back after sign in', async ({ browser }) => {
  const a = await browser.newContext({ storageState: ownerState });
  const id = await newDesign(await a.newPage());
  await a.close();

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`/d/${id}`);
  await expect(page).toHaveURL(new RegExp(`/login\\?next=(/|%2F)d(/|%2F)${id}$`));
  await page.getByLabel('Email').fill(owner.email);
  await page.getByLabel('Password').fill(owner.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/d/${id}$`));
  await expect(page.locator('.ph .page')).toBeVisible();
  await ctx.close();
});

test(`stranger opening someone else's /d/<id> sees "You don't have access to this design."`, async ({ browser }) => {
  const a = await browser.newContext({ storageState: ownerState });
  const id = await newDesign(await a.newPage());
  await a.close();

  const ctx = await browser.newContext({ storageState: strangerState });
  const page = await ctx.newPage();
  await page.goto(`/d/${id}`);
  await expect(page.getByText("You don't have access to this design.")).toBeVisible();
  await expect(page.locator('.ph .page')).toHaveCount(0);
  await ctx.close();
});

test('going offline shows the offline indicator; edits made offline appear on the other context after reconnect', async ({ browser }) => {
  test.setTimeout(120_000);
  const a = await browser.newContext({ storageState: ownerState });
  const b = await browser.newContext({ storageState: ownerState });
  const pa = await a.newPage();
  const pb = await b.newPage();
  const id = await newDesign(pa);
  await openDesign(pb, id);
  await expect(syncState(pa)).toHaveText('Saved');

  await a.setOffline(true);
  await addHeading(pa, 'Written offline');
  await expect(syncState(pa)).toHaveText('Offline, changes kept on this computer', { timeout: 15_000 });
  await expect(pb.locator('.ph .tx', { hasText: 'Written offline' })).toHaveCount(0);

  await a.setOffline(false);
  await expect(pb.locator('.ph .tx', { hasText: 'Written offline' })).toBeVisible({ timeout: 45_000 });
  await expect(syncState(pa)).toHaveText('Saved', { timeout: 15_000 });
  await a.close();
  await b.close();
});
