import fs from 'node:fs';
import { expect, test, type Browser, type BrowserContext, type Page, type Route } from '@playwright/test';
import { makePng } from '../helpers';
import { cleanupUsers, cloudConfigured, newDesign, newUser, signIn } from './helpers';

test.skip(!cloudConfigured, 'needs the TEST Supabase project (.env.test.local)');
// One worker, in order: the owner signs in once (sign-in is rate-limited) and every test reuses the session.
test.describe.configure({ mode: 'default' });
test.afterAll(cleanupUsers);

type State = Awaited<ReturnType<BrowserContext['storageState']>>;

let ownerState: State;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  test.setTimeout(120_000);
  const owner = await newUser('Owner');
  const ctx = await browser.newContext();
  await signIn(await ctx.newPage(), owner);
  ownerState = await ctx.storageState();
  await ctx.close();
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

/** A photo-like JPEG (random noise, so it doesn't compress to nothing): about 0.5 MB once stored. */
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

/** Uploads one photo through Photos → Upload photos and waits for it in the tray. */
async function uploadToTray(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.getByRole('button', { name: 'Photos', exact: true }).click();
  const before = await page.getByTestId('tray').locator('.t').count();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload photos' }).click();
  await (await chooser).setFiles([file]);
  await expect(page.getByTestId('tray').locator('.t')).toHaveCount(before + 1, { timeout: 20_000 });
}

const cloudPhotos = (page: Page) => page.locator('.ph .el-image .im[style*="blob:"]');
const syncState = (page: Page) => page.getByTestId('sync-state');

/** Opens the account menu and returns the usage line's text. */
async function usageText(page: Page) {
  await page.getByRole('button', { name: 'Account' }).click();
  const line = page.getByTestId('photo-usage');
  await expect(line).toHaveText(/^\d+\.\d MB of 50 MB used$/);
  const text = (await line.textContent())!;
  await page.keyboard.press('Escape');
  return text;
}
const mb = (text: string) => parseFloat(text);

test('photo uploaded on A appears on B', async ({ browser }) => {
  const a = await browser.newContext({ storageState: ownerState });
  const b = await browser.newContext({ storageState: ownerState });
  const pa = await a.newPage();
  const pb = await b.newPage();
  const errors = [...watchErrors(pa), ...watchErrors(pb)];
  const id = await newDesign(pa);

  const upload = pa.waitForResponse((r) => r.url().includes('/storage/v1/object/photos/') && r.request().method() === 'POST');
  await uploadToTray(pa, { name: 'a.png', mimeType: 'image/png', buffer: await makePng(pa) });
  const res = await upload;
  expect(res.ok()).toBe(true);
  expect(res.url()).toMatch(/\.jpg$/); // an opaque PNG is stored as JPEG
  await pa.getByTestId('tray').locator('.t').first().getByRole('button', { name: 'Add to page' }).click();
  await expect(cloudPhotos(pa)).toHaveCount(1);
  await expect(syncState(pa)).toHaveText('Saved');

  await openDesign(pb, id);
  await expect(cloudPhotos(pb)).toHaveCount(1);
  await pb.getByRole('button', { name: 'Photos', exact: true }).click();
  await expect(pb.getByTestId('tray').locator('.t[style*="blob:"]')).toHaveCount(1);
  expect(errors).toEqual([]);
  await a.close();
  await b.close();
});

test('export PNG of a page with a cloud photo succeeds', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: ownerState });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  const id = await newDesign(page);
  await uploadToTray(page, { name: 'a.jpg', mimeType: 'image/jpeg', buffer: await makeNoiseJpeg(page, 800, 600) });
  await page.getByTestId('tray').locator('.t').first().getByRole('button', { name: 'Add to page' }).click();
  await expect(cloudPhotos(page)).toHaveCount(1);
  await expect(syncState(page)).toHaveText('Saved');

  // A fresh visit exports straight away: the export waits for the photo instead of drawing an empty frame.
  await page.goto('about:blank');
  await openDesign(page, id);
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PNG' }).click();
  const file = await dl;
  const size = fs.statSync((await file.path())!).size;
  expect(size).toBeGreaterThan(10 * 1024);
  // The noise photo doesn't compress: drawn, it alone makes the PNG over 1.5 MB (about 0.8 MB without it).
  expect(size).toBeGreaterThan(1.5 * 1024 * 1024);
  await expect(page.locator('.toast')).toContainText('PNG saved to your downloads.');
  expect(errors).toEqual([]);
  await ctx.close();
});

test('element referencing a not-yet-available photo shows the empty frame and fills in once uploaded', async ({ browser }) => {
  const a = await browser.newContext({ storageState: ownerState });
  const b = await browser.newContext({ storageState: ownerState });
  const pa = await a.newPage();
  const pb = await b.newPage();
  const errors = [...watchErrors(pa), ...watchErrors(pb)];
  const id = await newDesign(pa);
  await expect(syncState(pa)).toHaveText('Saved');

  // B's photo downloads wait until the test lets them through.
  const held: Route[] = [];
  let release = false;
  await b.route('**/storage/v1/object/**', (route) => {
    if (release || route.request().method() !== 'GET') return route.continue();
    held.push(route);
  });
  await openDesign(pb, id);
  const empty = pb.locator('.ph .el-image .ph-empty');
  const emptyBefore = await empty.count();

  await uploadToTray(pa, { name: 'a.png', mimeType: 'image/png', buffer: await makePng(pa, '#e76f51') });
  await pa.getByTestId('tray').locator('.t').first().getByRole('button', { name: 'Add to page' }).click();
  await expect(cloudPhotos(pa)).toHaveCount(1);

  // The new element is there on B, drawn as an empty frame while its photo is on the way.
  await expect(empty).toHaveCount(emptyBefore + 1, { timeout: 10_000 });
  await expect.poll(() => held.length).toBeGreaterThan(0);
  await expect(cloudPhotos(pb)).toHaveCount(0);

  release = true;
  for (const r of held.splice(0)) await r.continue();
  await expect(cloudPhotos(pb)).toHaveCount(1);
  await expect(empty).toHaveCount(emptyBefore);
  expect(errors).toEqual([]);
  await a.close();
  await b.close();
});

test('usage shows in the account menu after upload', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: ownerState });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await newDesign(page);
  const before = mb(await usageText(page));

  await uploadToTray(page, { name: 'big.jpg', mimeType: 'image/jpeg', buffer: await makeNoiseJpeg(page) });
  const after = mb(await usageText(page));
  expect(after).toBeGreaterThan(before);

  // Removing it from the design keeps it in the library (still counted), newest first...
  const lib = page.getByTestId('library').locator('.t');
  const others = await lib.count();
  await page.getByTestId('tray').locator('.t').first().getByRole('button', { name: 'Remove photo' }).click();
  await expect(lib).toHaveCount(others + 1);
  expect(mb(await usageText(page))).toBe(after);
  // ...deleting it there (✕, then again to confirm) gives its space back: the stored file goes, then its row.
  const freed = page.waitForResponse((r) => r.url().includes('/rest/v1/photos') && r.request().method() === 'DELETE');
  await lib.first().getByRole('button', { name: 'Delete photo' }).click();
  await lib.first().getByRole('button', { name: 'Delete for good' }).click();
  expect((await freed).ok()).toBe(true);
  await expect(lib).toHaveCount(others);
  expect(mb(await usageText(page))).toBeLessThan(after);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('a see-through photo still over 5 MB once shrunk says it is too big and sends nothing', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: ownerState });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await newDesign(page);
  // Semi-transparent noise: it stays PNG and doesn't compress (about 10 MB at 1600×1600).
  const b64 = await page.evaluate(() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1600;
    const g = cv.getContext('2d')!;
    const img = g.createImageData(1600, 1600);
    for (let i = 0; i < img.data.length; i++) img.data[i] = i % 4 === 3 ? 128 + Math.floor(Math.random() * 120) : Math.floor(Math.random() * 256);
    g.putImageData(img, 0, 0);
    return cv.toDataURL('image/png').split(',')[1];
  });
  let sent = 0;
  page.on('request', (r) => {
    if (/\/rest\/v1\/photos|\/storage\/v1\/object\//.test(r.url()) && r.method() !== 'GET') sent++;
  });
  await page.getByRole('button', { name: 'Photos', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload photos' }).click();
  await (await chooser).setFiles([{ name: 'huge.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }]);
  await expect(page.locator('.toast')).toHaveText('That photo is too big to add (over 5 MB). Try a smaller one.', { timeout: 20_000 });
  await expect(page.getByTestId('tray')).toHaveCount(0);
  expect(sent).toBe(0);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('adding a photo while offline says so and adds nothing', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: ownerState });
  const page = await ctx.newPage();
  await newDesign(page);
  await expect(syncState(page)).toHaveText('Saved');
  await page.getByRole('button', { name: 'Photos', exact: true }).click();
  await ctx.setOffline(true);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload photos' }).click();
  await (await chooser).setFiles([{ name: 'a.png', mimeType: 'image/png', buffer: await makePng(page) }]);
  await expect(page.locator('.toast')).toHaveText("You're offline. Photos can be added once you're back online.");
  await expect(page.getByTestId('tray')).toHaveCount(0);
  await ctx.setOffline(false);
  await ctx.close();
});

test('one photo serves every design: it shows under More of your photos, and adding or re-uploading it stores nothing new', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: ownerState });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  const file = { name: 'shared.png', mimeType: 'image/png', buffer: await makePng(page, '#3d5a80') };
  let stored = 0;
  page.on('request', (r) => {
    if (r.url().includes('/storage/v1/object/photos/') && r.method() === 'POST') stored++;
  });

  // Design A: upload it.
  const a = await newDesign(page);
  await uploadToTray(page, file);
  expect(stored).toBe(1);
  const used = mb(await usageText(page));

  // Design B: it's there to add (newest first, after any photos earlier tests left), and adding it stores nothing.
  await newDesign(page);
  await page.getByRole('button', { name: 'Photos', exact: true }).click();
  const lib = page.getByTestId('library').locator('.t');
  await expect(lib.first()).toHaveAttribute('style', /blob:/);
  const inLibrary = await lib.count();
  await page.screenshot({ path: 'e2e/shots/53-photo-library.png' });
  await lib.first().getByRole('button', { name: 'Add to this design' }).click();
  await expect(page.getByTestId('tray').locator('.t')).toHaveCount(1);
  await expect(lib).toHaveCount(inLibrary - 1);
  await page.getByTestId('tray').locator('.t').first().getByRole('button', { name: 'Add to page' }).click();
  await expect(cloudPhotos(page)).toHaveCount(1);

  // Uploading the same file again here: nothing is sent and it doesn't show twice.
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload photos' }).click();
  await (await chooser).setFiles([file]);
  await expect(page.locator('.toast')).toContainText('1 photo added');
  await expect(page.getByTestId('tray').locator('.t')).toHaveCount(1);
  expect(stored).toBe(1);
  expect(mb(await usageText(page))).toBe(used);

  // Design C: deleting it is refused while A and B use it.
  await newDesign(page);
  await page.getByRole('button', { name: 'Photos', exact: true }).click();
  await lib.first().getByRole('button', { name: 'Delete photo' }).click();
  await lib.first().getByRole('button', { name: 'Delete for good' }).click();
  await expect(page.locator('.toast')).toHaveText('A design still uses this photo. Remove it from that design first.');
  await expect(lib).toHaveCount(inLibrary);

  // Design A still shows it after a reload.
  await openDesign(page, a);
  await page.getByRole('button', { name: 'Photos', exact: true }).click();
  await expect(page.getByTestId('tray').locator('.t[style*="blob:"]')).toHaveCount(1);
  expect(errors).toEqual([]);
  await ctx.close();
});
