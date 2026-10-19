import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
  cleanupUsers,
  cloudConfigured,
  confirmUser,
  memberLinks,
  newDesign,
  newUnconfirmedUser,
  newUser,
  signIn,
  testEmail,
  type TestUser,
} from './helpers';

test.skip(!cloudConfigured, 'needs the TEST Supabase project (.env.test.local)');
// One worker, in order: each user signs in once (sign-in is rate-limited) and later tests reuse the session.
test.describe.configure({ mode: 'default' });
test.afterAll(cleanupUsers);

type State = Awaited<ReturnType<BrowserContext['storageState']>>;

let owner: TestUser;
let editor: TestUser;
let viewer: TestUser;
let ownerState: State;
let editorState: State;
let viewerState: State;

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
  editor = await newUser('Editor');
  viewer = await newUser('Viewer');
  ownerState = await sessionFor(browser, owner);
  editorState = await sessionFor(browser, editor);
  viewerState = await sessionFor(browser, viewer);
});

/** Records runtime errors, ignoring network failures (expected when access goes, and from external fonts). */
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

/** Shares the open design from its owner's editor; the dialog stays open. */
async function shareTo(page: Page, email: string, role: 'Can edit' | 'Can view') {
  const dlg = page.getByRole('dialog', { name: 'Share this design' });
  if (!(await dlg.isVisible())) await page.getByRole('button', { name: 'Share', exact: true }).click();
  await dlg.getByLabel('Email').fill(email);
  await dlg.getByLabel('Access', { exact: true }).selectOption({ label: role });
  await dlg.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(dlg.getByTestId('member').filter({ hasText: email.trim().toLowerCase() })).toBeVisible();
  return dlg;
}

const syncState = (page: Page) => page.getByTestId('sync-state');

test('owner shares by email (Can edit); invitee sees it under Shared with me and edits appear live for the owner', async ({ browser }) => {
  const a = await browser.newContext({ storageState: ownerState });
  const pa = await a.newPage();
  const errors = watchErrors(pa);
  const id = await newDesign(pa);

  // Mixed case and spaces are fine: the address is stored lowercase.
  const dlg = await shareTo(pa, `  ${editor.email.toUpperCase()} `, 'Can edit');
  const row = dlg.getByTestId('member').filter({ hasText: editor.email });
  await expect(row.getByLabel(`Access for ${editor.email}`)).toHaveValue('editor');
  await expect(row).not.toContainText('Invited');
  // Sharing to yourself says so.
  await dlg.getByLabel('Email').fill(owner.email);
  await dlg.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(dlg.getByRole('alert')).toHaveText("That's you.");
  await dlg.getByRole('button', { name: 'Done' }).click();
  await expect(dlg).toHaveCount(0);

  const b = await browser.newContext({ storageState: editorState });
  const pb = await b.newPage();
  errors.push(...watchErrors(pb));
  await pb.goto('/designs');
  await pb.getByRole('tab', { name: 'Shared with me' }).click();
  const card = pb.locator(`[data-design-id="${id}"]`);
  await expect(card).toContainText('Can edit');
  await card.getByRole('link', { name: 'Untitled calendar', exact: true }).click();
  await expect(pb.locator('.ph .page')).toBeVisible();
  await expect(pb.locator('.app')).not.toHaveClass(/readonly/);

  await addHeading(pb, 'Written by the invitee');
  await expect(pa.locator('.ph .tx', { hasText: 'Written by the invitee' })).toBeVisible({ timeout: 5000 });
  expect(errors).toEqual([]);
  await a.close();
  await b.close();
});

test('Can view user sees View only, cannot move an element, can export PNG and Save a copy', async ({ browser }) => {
  const a = await browser.newContext({ storageState: ownerState });
  const pa = await a.newPage();
  const id = await newDesign(pa);
  await addHeading(pa, 'Look but do not touch');
  await expect(syncState(pa)).toHaveText('Saved');
  await shareTo(pa, viewer.email, 'Can view');
  await a.close();

  const ctx = await browser.newContext({ storageState: viewerState, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await openDesign(page, id);
  await expect(page.getByText('View only', { exact: true })).toBeVisible();
  await expect(page.locator('.app')).toHaveClass(/readonly/);

  const heading = page.locator('.ph .tx', { hasText: 'Look but do not touch' });
  const before = (await heading.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 80, before.y + before.height / 2 + 30, { steps: 6 });
  await page.mouse.up();
  expect(await heading.boundingBox()).toEqual(before);
  await expect(page.getByTestId('selection')).toHaveCount(0);
  // Nothing in the inspector or the Add panel can change the design.
  await expect(page.locator('.insp textarea')).toHaveValue('Look but do not touch'); // selecting still shows its settings
  await expect(page.locator('.insp textarea')).toBeDisabled();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add a heading' })).toBeDisabled();

  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PNG' }).click();
  expect((await dl).suggestedFilename()).toMatch(/\.png$/);

  await page.getByRole('button', { name: 'Save a copy' }).click();
  await page.waitForURL((u) => /\/d\/[0-9a-f-]{36}$/.test(u.pathname) && !u.pathname.endsWith(id));
  await expect(page.locator('.ph .tx', { hasText: 'Look but do not touch' })).toBeVisible();
  await expect(page.getByLabel('Design name')).toHaveValue('Untitled calendar (copy)');
  await expect(page.locator('.app')).not.toHaveClass(/readonly/);
  await expect(page.getByText('View only', { exact: true })).toHaveCount(0);
  await expect(syncState(page)).toHaveText('Saved');
  expect(errors).toEqual([]);
  await ctx.close();
});

test('sharing to an email without an account shows Invited; after that email signs up and is confirmed it appears for them', async ({ browser }) => {
  test.setTimeout(90_000);
  const a = await browser.newContext({ storageState: ownerState });
  const pa = await a.newPage();
  const id = await newDesign(pa);
  const email = testEmail();
  const dlg = await shareTo(pa, email, 'Can view');
  const row = dlg.getByTestId('member').filter({ hasText: email });
  await expect(row).toContainText('Invited — appears for them once they sign up with this email');

  // Signed up but not confirmed yet: the invitation stays unclaimed.
  const late = await newUnconfirmedUser(email);
  expect((await memberLinks(id))[email]).toBeNull();
  await pa.reload();
  await pa.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(dlg.getByTestId('member').filter({ hasText: email })).toContainText('Invited');

  await confirmUser(late.id);
  expect((await memberLinks(id))[email]).toBe(late.id);
  await a.close();

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, late);
  await page.goto('/designs');
  await page.getByRole('tab', { name: 'Shared with me' }).click();
  await expect(page.locator(`[data-design-id="${id}"]`)).toContainText('Can view');
  await ctx.close();

  const again = await browser.newContext({ storageState: ownerState });
  const po = await again.newPage();
  await openDesign(po, id);
  await po.getByRole('button', { name: 'Share', exact: true }).click();
  const joined = po.getByRole('dialog').getByTestId('member').filter({ hasText: email });
  await expect(joined).toBeVisible();
  await expect(joined).not.toContainText('Invited');
  await again.close();
});

test('removing access while the invitee has it open shows the access-lost banner and Save as a copy works', async ({ browser }) => {
  const a = await browser.newContext({ storageState: ownerState });
  const pa = await a.newPage();
  const id = await newDesign(pa);
  await addHeading(pa, 'Shared for a while');
  await expect(syncState(pa)).toHaveText('Saved');
  const dlg = await shareTo(pa, editor.email, 'Can edit');

  const b = await browser.newContext({ storageState: editorState });
  const p1 = await b.newPage();
  const p2 = await b.newPage();
  const errors = [...watchErrors(p1), ...watchErrors(p2)];
  await openDesign(p1, id);
  await openDesign(p2, id);
  await expect(p1.locator('.ph .tx', { hasText: 'Shared for a while' })).toBeVisible();

  await dlg.getByTestId('member').filter({ hasText: editor.email }).getByRole('button', { name: 'Remove' }).click();
  await expect(dlg.getByTestId('member')).toHaveCount(0);

  // The next edit is refused: the editor says access is gone and stops editing.
  await addHeading(p1, 'Kept in my copy');
  const banner = p1.getByTestId('cloud-banner');
  await expect(banner).toContainText('You no longer have access to this design.', { timeout: 15_000 });
  await expect(p1.locator('.app')).toHaveClass(/readonly/);

  await banner.getByRole('button', { name: 'Save as a copy in My designs' }).click();
  await p1.waitForURL((u) => /\/d\/[0-9a-f-]{36}$/.test(u.pathname) && !u.pathname.endsWith(id));
  await expect(p1.locator('.ph .tx', { hasText: 'Shared for a while' })).toBeVisible();
  await expect(p1.locator('.ph .tx', { hasText: 'Kept in my copy' })).toBeVisible();
  await expect(p1.getByLabel('Design name')).toHaveValue('Untitled calendar (copy)');
  await expect(syncState(p1)).toHaveText('Saved');

  // Close leaves for My designs.
  await addHeading(p2, 'Refused too');
  await expect(p2.getByTestId('cloud-banner')).toContainText('You no longer have access to this design.', { timeout: 15_000 });
  await p2.getByTestId('cloud-banner').getByRole('button', { name: 'Close' }).click();
  await expect(p2).toHaveURL(/\/designs$/);
  expect(errors).toEqual([]);
  await a.close();
  await b.close();
});

test('only owner sees Share and rename', async ({ browser }) => {
  const a = await browser.newContext({ storageState: ownerState });
  const pa = await a.newPage();
  const id = await newDesign(pa);
  await expect(pa.getByRole('button', { name: 'Share', exact: true })).toBeVisible();
  await expect(pa.getByLabel('Design name')).toBeVisible();
  await shareTo(pa, editor.email, 'Can edit');
  await shareTo(pa, viewer.email, 'Can view');
  await a.close();

  for (const state of [editorState, viewerState]) {
    const ctx = await browser.newContext({ storageState: state });
    const page = await ctx.newPage();
    await openDesign(page, id);
    await expect(syncState(page)).toHaveText('Saved');
    await expect(page.locator('.cloud-name')).toHaveText('Untitled calendar');
    await expect(page.getByRole('button', { name: 'Share', exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Design name')).toHaveCount(0);
    await ctx.close();
  }
});
