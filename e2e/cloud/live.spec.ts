import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { cleanupUsers, cloudConfigured, newDesign, newUser, signIn, type TestUser } from './helpers';

test.skip(!cloudConfigured, 'needs the TEST Supabase project (.env.test.local)');
// One worker, in order: each user signs in once (sign-in is rate-limited) and later tests reuse the session.
test.describe.configure({ mode: 'default' });
test.afterAll(cleanupUsers);

type State = Awaited<ReturnType<BrowserContext['storageState']>>;

let ana: TestUser;
let ben: TestUser;
let anaState: State;
let benState: State;

async function sessionFor(browser: Browser, user: TestUser): Promise<State> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, user);
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

test.beforeAll(async ({ browser }) => {
  test.setTimeout(90_000);
  ana = await newUser('Ana');
  ben = await newUser('Ben');
  anaState = await sessionFor(browser, ana);
  benState = await sessionFor(browser, ben);
});

/** Records runtime errors, ignoring network failures (from external fonts and the like). */
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
  await expect(syncState(page)).toHaveText('Saved');
}

async function addHeading(page: Page, text: string) {
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Add a heading' }).click();
  await page.locator('.insp textarea').fill(text);
  await expect(page.locator('.ph .tx', { hasText: text })).toBeVisible();
}

const syncState = (page: Page) => page.getByTestId('sync-state');
const heading = (page: Page, text: string) => page.locator('.ph .tx', { hasText: text });

/** Ana makes a design and shares it with Ben (Can edit); both have it open. */
async function together(browser: Browser) {
  const a = await browser.newContext({ storageState: anaState });
  const pa = await a.newPage();
  const errors = watchErrors(pa);
  const id = await newDesign(pa);
  await pa.getByRole('button', { name: 'Share', exact: true }).click();
  const dlg = pa.getByRole('dialog', { name: 'Share this design' });
  await dlg.getByLabel('Email').fill(ben.email);
  await dlg.getByLabel('Access', { exact: true }).selectOption({ label: 'Can edit' });
  await dlg.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(dlg.getByTestId('member').filter({ hasText: ben.email })).toBeVisible();
  await dlg.getByRole('button', { name: 'Done' }).click();

  const b = await browser.newContext({ storageState: benState });
  const pb = await b.newPage();
  errors.push(...watchErrors(pb));
  await openDesign(pb, id);
  await expect(pa.getByTestId('presence-avatar')).toHaveAttribute('title', 'Ben');
  await expect(pb.getByTestId('presence-avatar')).toHaveAttribute('title', 'Ana');
  const close = async () => {
    await a.close();
    await b.close();
  };
  return { id, pa, pb, errors, close };
}

test("the other person's avatar appears and their selected element gets a coloured outline", async ({ browser }) => {
  const { pa, pb, errors, close } = await together(browser);
  // One avatar per person, an initial in a coloured circle.
  await expect(pa.getByTestId('presence-avatar')).toHaveCount(1);
  await expect(pa.getByTestId('presence-avatar')).toHaveText('B');

  await addHeading(pb, 'Ben is here');
  const outline = pa.getByTestId('other-selection');
  await expect(outline).toHaveCount(1);
  await expect(outline).toContainText('Ben');
  const style = await outline.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(style).toBe('solid');
  const color = await outline.evaluate((el) => getComputedStyle(el).outlineColor);
  const avatar = await pa.getByTestId('presence-avatar').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(color).toBe(avatar);
  // The outline sits on Ben's element.
  const box = (await outline.boundingBox())!;
  const el = (await heading(pa, 'Ben is here').boundingBox())!;
  expect(Math.abs(box.x - el.x)).toBeLessThan(3);
  expect(Math.abs(box.y - el.y)).toBeLessThan(3);

  // Only for people on the same page.
  await pb.getByRole('button', { name: 'Next page' }).click();
  await expect(outline).toHaveCount(0);
  await expect(pa.getByTestId('presence-avatar')).toHaveCount(1);
  expect(errors).toEqual([]);
  await close();
});

test("undo on A doesn't revert B's change", async ({ browser }) => {
  const { pa, pb, errors, close } = await together(browser);
  await addHeading(pa, 'Written by Ana');
  await expect(heading(pb, 'Written by Ana')).toBeVisible();
  await addHeading(pb, 'Written by Ben');
  await expect(heading(pa, 'Written by Ben')).toBeVisible();

  // Ana's last step was typing her heading's text: undo takes that back, and only that.
  await pa.getByRole('button', { name: 'Undo' }).click();
  for (const p of [pa, pb]) {
    await expect(heading(p, 'Written by Ana')).toHaveCount(0);
    await expect(heading(p, 'Written by Ben')).toBeVisible();
  }
  // Redo brings it back.
  await pa.getByRole('button', { name: 'Redo' }).click();
  await expect(heading(pb, 'Written by Ana')).toBeVisible();
  await expect(heading(pb, 'Written by Ben')).toBeVisible();
  expect(errors).toEqual([]);
  await close();
});

test('Fill year while someone else is in the design asks for confirmation; Cancel leaves pages unchanged', async ({ browser }) => {
  const { pa, pb, errors, close } = await together(browser);
  const label = pa.getByTestId('page-label');
  const total = Number((await label.textContent())!.match(/of (\d+)/)![1]);
  // From a later page, Fill year would leave fewer pages.
  for (let i = 0; i < 4; i++) await pa.getByRole('button', { name: 'Next page' }).click();
  await expect(label).toHaveText(new RegExp(`^Page 5 of ${total} `));
  await pa.getByRole('button', { name: 'Pages', exact: true }).click();
  await pa.getByRole('button', { name: 'Fill the rest of the year from this design' }).click();
  await pa.getByRole('button', { name: 'Click again to confirm' }).click();

  const dlg = pa.getByTestId('replace-confirm');
  await expect(dlg).toContainText('Ben is also editing. This replaces all pages.');
  await expect(dlg.getByRole('button', { name: 'Replace anyway' })).toBeVisible();
  await dlg.getByRole('button', { name: 'Cancel' }).click();
  await expect(dlg).toHaveCount(0);
  await expect(label).toHaveText(new RegExp(`^Page 5 of ${total} `));
  await expect(pb.getByTestId('page-label')).toHaveText(new RegExp(` of ${total} `));

  // Replace anyway goes ahead, for both.
  await pa.getByRole('button', { name: 'Fill the rest of the year from this design' }).click();
  await pa.getByRole('button', { name: 'Click again to confirm' }).click();
  await dlg.getByRole('button', { name: 'Replace anyway' }).click();
  await expect(label).not.toHaveText(new RegExp(` of ${total} `));
  const after = Number((await label.textContent())!.match(/of (\d+)/)![1]);
  expect(after).toBeLessThan(total);
  await expect(pb.getByTestId('page-label')).toHaveText(new RegExp(` of ${after} `));
  expect(errors).toEqual([]);
  await close();
});

test('simultaneous edits to different elements from A and B both persist after reload', async ({ browser }) => {
  const { pa, pb, errors, close } = await together(browser);
  await Promise.all([addHeading(pa, 'Ana at the same time'), addHeading(pb, 'Ben at the same time')]);
  for (const p of [pa, pb]) {
    await expect(heading(p, 'Ana at the same time')).toBeVisible();
    await expect(heading(p, 'Ben at the same time')).toBeVisible();
    await expect(syncState(p)).toHaveText('Saved');
  }
  for (const p of [pa, pb]) {
    await p.reload();
    await expect(heading(p, 'Ana at the same time')).toBeVisible();
    await expect(heading(p, 'Ben at the same time')).toBeVisible();
  }
  expect(errors).toEqual([]);
  await close();
});
