import { readFileSync } from 'node:fs';
import { expect, test, type Browser, type BrowserContext, type Page, type Route } from '@playwright/test';
import { makePng } from '../helpers';
import { cleanupUsers, cloudConfigured, designNames, newDesign, newUser, seedPhotoUsage, signIn, type TestUser } from './helpers';

test.skip(!cloudConfigured, 'needs the TEST Supabase project (.env.test.local)');
// One worker, in order: each user signs in once (sign-in is rate-limited) and every test reuses the session.
test.describe.configure({ mode: 'default' });
test.afterAll(cleanupUsers);

type State = Awaited<ReturnType<BrowserContext['storageState']>>;

let mainUser: TestUser;
let mainState: State;
let fullUser: TestUser;
let fullState: State;

async function sessionFor(browser: Browser, user: TestUser): Promise<State> {
  const ctx = await browser.newContext();
  await signIn(await ctx.newPage(), user);
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  mainUser = await newUser('Main');
  fullUser = await newUser('Full');
  mainState = await sessionFor(browser, mainUser);
  fullState = await sessionFor(browser, fullUser);
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

async function openLocal(page: Page) {
  await page.goto('/');
  await expect(page.locator('.ph .page')).toBeVisible();
}

async function addHeading(page: Page, text: string) {
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Add a heading' }).click();
  await page.locator('.insp textarea').fill(text);
  await expect(page.locator('.ph .tx', { hasText: text })).toBeVisible();
}

/** A photo-like JPEG (random noise, so it doesn't compress to nothing). */
async function makeNoiseJpeg(page: Page, w = 1200, h = 900): Promise<Buffer> {
  const b64 = await page.evaluate(
    ([w, h]) => {
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const g = cv.getContext('2d')!;
      const img = g.createImageData(w, h);
      for (let i = 0; i < img.data.length; i++) img.data[i] = i % 4 === 3 ? 255 : Math.floor(Math.random() * 256);
      g.putImageData(img, 0, 0);
      return cv.toDataURL('image/jpeg', 0.9).split(',')[1];
    },
    [w, h] as const,
  );
  return Buffer.from(b64, 'base64');
}

/** Uploads one photo through Photos → Upload photos, waits for it in the tray and puts it on the page. */
async function addPhoto(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.getByRole('button', { name: 'Photos', exact: true }).click();
  const before = await page.getByTestId('tray').locator('.t').count();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload photos' }).click();
  await (await chooser).setFiles([file]);
  await expect(page.getByTestId('tray').locator('.t')).toHaveCount(before + 1, { timeout: 20_000 });
  await page.getByTestId('tray').locator('.t').first().getByRole('button', { name: 'Add to page' }).click();
}

async function openFile(page: Page, file: string | { name: string; mimeType: string; buffer: Buffer }) {
  await page.getByRole('button', { name: 'Pages', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Open design file' }).click();
  await (await chooser).setFiles(file);
}

async function saveFile(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Pages', exact: true }).click();
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save design file' }).click();
  return (await (await dl).path())!;
}

/** Photos drawn from data URLs: uploaded ones on the local editor, and the sample photos of a new calendar. */
const localPhotos = (page: Page) => page.locator('.ph .el-image .im[style*="data:"]');
const trayPhotos = (page: Page) => page.getByTestId('tray').locator('.t[style*="data:"]');
const cloudPhotos = (page: Page) => page.locator('.ph .el-image .im[style*="blob:"]');
const syncState = (page: Page) => page.getByTestId('sync-state');
const banner = (page: Page) => page.getByTestId('cloud-banner');
const FULL = 'Your 50 MB photo space is full. Remove photos from your designs to add more.';

test('local design with a photo migrates and opens in the cloud editor; local copy still on /', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: mainState });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await openLocal(page);
  await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
  // An untouched calendar has nothing worth keeping yet.
  await expect(banner(page)).toHaveCount(0);

  await addHeading(page, 'Santos Family');
  const samples = await localPhotos(page).count();
  await addPhoto(page, { name: 'family.png', mimeType: 'image/png', buffer: await makePng(page, '#264653') });
  await expect(localPhotos(page)).toHaveCount(samples + 1);
  await expect(banner(page)).toContainText('Keep this calendar on every computer?');

  // The upload waits until the progress has been seen.
  const held: Route[] = [];
  let release = false;
  await page.route('**/storage/v1/object/photos/**', (route) => {
    if (release || route.request().method() !== 'POST') return route.continue();
    held.push(route);
  });
  await banner(page).getByRole('button', { name: 'Save to My designs' }).click();
  await expect(banner(page)).toContainText('Uploading photos 1 of 1…');
  await expect.poll(() => held.length).toBe(1);
  release = true;
  for (const r of held.splice(0)) await r.continue();

  await page.waitForURL(/\/d\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  await expect(page.locator('.ph .tx', { hasText: 'Santos Family' })).toBeVisible();
  await expect(cloudPhotos(page)).toHaveCount(1);
  await expect(syncState(page)).toHaveText('Saved');

  // The local design is still there, and the offer doesn't come back.
  await openLocal(page);
  await expect(page.locator('.ph .tx', { hasText: 'Santos Family' })).toBeVisible();
  await expect(localPhotos(page)).toHaveCount(samples + 1);
  await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('migration over the photo cap leaves no new design and shows the limit message', async ({ browser }) => {
  await seedPhotoUsage(fullUser.id, 52428800 - 50_000);
  const ctx = await browser.newContext({ storageState: fullState });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await openLocal(page);
  await addPhoto(page, { name: 'big.jpg', mimeType: 'image/jpeg', buffer: await makeNoiseJpeg(page) });
  await expect(trayPhotos(page)).toHaveCount(1);
  let sent = 0;
  page.on('request', (r) => {
    if (/\/rest\/v1\/(designs|photos)|\/storage\/v1\/object\//.test(r.url()) && r.method() !== 'GET') sent++;
  });
  await banner(page).getByRole('button', { name: 'Save to My designs' }).click();
  await expect(page.locator('.toast')).toHaveText(FULL);
  await expect(page).toHaveURL(/\/$/);
  expect(sent).toBe(0);
  expect(await designNames(fullUser.id)).toEqual(['Seeded photos']);
  // The local design is untouched and can still be saved later.
  await expect(trayPhotos(page)).toHaveCount(1);
  await expect(banner(page)).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});

test('Save file from a cloud design re-opens signed out with photos visible', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: mainState });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await newDesign(page);
  await addHeading(page, 'Cloud backup');
  await addPhoto(page, { name: 'a.png', mimeType: 'image/png', buffer: await makePng(page, '#e76f51') });
  await expect(cloudPhotos(page)).toHaveCount(1);
  await expect(syncState(page)).toHaveText('Saved');
  // The new calendar's sample photos plus the uploaded one.
  const drawn = await page.locator('.ph .el-image .im[style*="data:"], .ph .el-image .im[style*="blob:"]').count();
  const path = await saveFile(page);
  const saved = JSON.parse(readFileSync(path, 'utf8'));
  for (const a of Object.values(saved.doc.assets as Record<string, { src: string }>)) expect(a.src).toMatch(/^data:image\//);

  const out = await browser.newContext();
  const p2 = await out.newPage();
  errors.push(...watchErrors(p2));
  await openLocal(p2);
  await openFile(p2, path);
  await expect(p2.locator('.toast')).toContainText('Opened');
  await expect(p2.locator('.ph .tx', { hasText: 'Cloud backup' })).toBeVisible();
  await expect(localPhotos(p2)).toHaveCount(drawn);
  await p2.getByRole('button', { name: 'Photos', exact: true }).click();
  await expect(trayPhotos(p2)).toHaveCount(1);
  expect(errors).toEqual([]);
  await out.close();
  await ctx.close();
});

test('Open file while signed in creates a new design in My designs', async ({ browser }) => {
  // A design file made signed out, with a photo in it.
  const out = await browser.newContext();
  const p1 = await out.newPage();
  await openLocal(p1);
  await addHeading(p1, 'From a file');
  await addPhoto(p1, { name: 'b.png', mimeType: 'image/png', buffer: await makePng(p1, '#2a9d8f') });
  const buffer = readFileSync(await saveFile(p1));
  await out.close();

  const ctx = await browser.newContext({ storageState: mainState });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await openLocal(page);
  await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
  await openFile(page, { name: 'Family plan.kalendaryo', mimeType: 'application/json', buffer });
  await page.waitForURL(/\/d\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  const id = page.url().split('/d/')[1];
  await expect(page.locator('.ph .tx', { hasText: 'From a file' })).toBeVisible();
  await expect(cloudPhotos(page)).toHaveCount(1);
  await expect(syncState(page)).toHaveText('Saved');

  await page.goto('/designs');
  await expect(page.locator(`[data-design-id="${id}"]`)).toContainText('Family plan');
  expect(errors).toEqual([]);
  await ctx.close();
});

test('saved template appears on a second context and applies with its photo', async ({ browser }) => {
  const a = await browser.newContext({ storageState: mainState });
  const pa = await a.newPage();
  const errors = watchErrors(pa);
  await newDesign(pa);
  await addHeading(pa, 'Template heading');
  await addPhoto(pa, { name: 'c.png', mimeType: 'image/png', buffer: await makePng(pa, '#8338ec') });
  await expect(cloudPhotos(pa)).toHaveCount(1);
  await pa.getByRole('button', { name: 'Templates' }).click();
  await pa.getByTestId('my-templates').getByRole('button', { name: 'Save this design as a template' }).click();
  await pa.getByTestId('save-template-modal').getByLabel('Template name').fill('Cloud tpl');
  await pa.getByTestId('save-template-modal').getByLabel('Template name').press('Enter');
  await expect(pa.locator('.toast')).toContainText('Saved “Cloud tpl”', { timeout: 20_000 });

  const b = await browser.newContext({ storageState: mainState });
  const pb = await b.newPage();
  errors.push(...watchErrors(pb));
  await newDesign(pb);
  await pb.getByRole('button', { name: 'Templates' }).click();
  const card = pb.getByTestId('my-templates').locator('.mytpl', { hasText: 'Cloud tpl' });
  await expect(card).toBeVisible();
  await expect(card.locator('.im[style*="blob:"]')).toHaveCount(1);

  const copied = pb.waitForResponse((r) => r.url().includes('/storage/v1/object/copy') && r.request().method() === 'POST');
  await card.locator('.tpl').click();
  await pb.getByTestId('my-templates').locator('.tpl[data-armed]').click();
  const res = await copied;
  expect(res.ok()).toBe(true);
  // The template's photo is copied into the account's photo library (once), and the design links it.
  expect(res.request().postDataJSON().destinationKey).toMatch(/^lib\/[0-9a-f-]{36}\//);
  await expect(pb.locator('.ph .tx', { hasText: 'Template heading' })).toBeVisible();
  await expect(cloudPhotos(pb)).toHaveCount(1);
  await expect(syncState(pb)).toHaveText('Saved');
  await pb.reload();
  await expect(cloudPhotos(pb)).toHaveCount(1);
  expect(errors).toEqual([]);
  await a.close();
  await b.close();
});

test('templates saved in this browser are copied to the account on first sign-in and stay here', async ({ browser }) => {
  const user = await newUser('Templates');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await openLocal(page);
  await addPhoto(page, { name: 'd.png', mimeType: 'image/png', buffer: await makePng(page, '#ff006e') });
  await page.getByRole('button', { name: 'Templates' }).click();
  const mine = page.getByTestId('my-templates');
  await mine.getByRole('button', { name: 'Save this design as a template' }).click();
  await page.getByTestId('save-template-modal').getByLabel('Template name').fill('Local tpl');
  await page.getByTestId('save-template-modal').getByLabel('Template name').press('Enter');
  const card = mine.locator('.mytpl', { hasText: 'Local tpl' });
  await expect(card).toBeVisible();
  const drawn = await card.locator('.im[style*="data:"]').count();

  await signIn(page, user);
  await newDesign(page);
  await page.getByRole('button', { name: 'Templates' }).click();
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card.locator('.im[style*="blob:"]')).toHaveCount(1);
  await expect(mine.locator('.mytpl')).toHaveCount(1);

  // Only once: another visit doesn't copy it again.
  await page.reload();
  await page.getByRole('button', { name: 'Templates' }).click();
  await expect(card).toBeVisible();
  await expect(mine.locator('.mytpl')).toHaveCount(1);

  // Signed out, this browser still has its own copy.
  await page.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await openLocal(page);
  await page.getByRole('button', { name: 'Templates' }).click();
  await expect(card).toBeVisible();
  await expect(card.locator('.im[style*="data:"]')).toHaveCount(drawn);
  expect(errors).toEqual([]);
  await ctx.close();
});
