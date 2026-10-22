import { expect, type Locator, type Page, test } from '@playwright/test';
import { makePng } from '../helpers';
import { cleanupUsers, cloudConfigured, deleteAllProducts, newUser, setAccount, signIn } from './helpers';

test.skip(!cloudConfigured, 'needs the TEST Supabase project (.env.test.local)');
// One spec owns the TEST project's products: start and end with none.
test.describe.configure({ mode: 'serial' });
test.beforeAll(deleteAllProducts);
test.afterAll(async () => {
  await deleteAllProducts();
  await cleanupUsers();
});

/** Types into a product field and leaves it, which saves it. */
async function fill(card: Locator, label: string, value: string) {
  const input = card.getByLabel(label);
  await input.fill(value);
  await input.press('Enter');
}

/** Drags a product card by its handle onto another card. */
async function dragOnto(page: Page, from: Locator, to: Locator) {
  const a = (await from.locator('.product-grip').boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2, b.y + b.height * 0.8, { steps: 12 });
  await page.mouse.up();
}

test('the admin adds, edits, reorders and hides print supplies, and visitors see them', async ({ page, browser }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const boss = await newUser('Boss');
  await setAccount(boss.id, { admin: true });
  await signIn(page, boss);
  await page.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('menuitem', { name: 'Products' }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await expect(page.getByRole('heading', { name: 'Print Kit' })).toBeVisible();

  // Two pictures at once: one product each, named after the file.
  const [red, blue] = [await makePng(page, '#d2335a'), await makePng(page, '#2f6fe4')];
  await page.getByTestId('product-add-files').setInputFiles([
    { name: 'desk-stand.png', mimeType: 'image/png', buffer: red },
    { name: 'photo_paper.png', mimeType: 'image/png', buffer: blue },
  ]);
  const cards = page.getByTestId('product');
  await expect(cards).toHaveCount(2);
  const [stand, paper] = [cards.nth(0), cards.nth(1)];
  await expect(stand.getByLabel('Name')).toHaveValue('desk stand');
  await expect(stand.locator('.product-img img')).toBeVisible();
  await expect.poll(() => stand.locator('.product-img img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);

  await fill(stand, 'Name', 'Desk calendar stand');
  await fill(stand, 'Price (₱)', '₱1,249.50');
  await fill(stand, 'Note', 'For 8×5 in desk calendars');
  await fill(stand, 'Shopee affiliate link', 'http://not-secure.example');
  await expect(stand.getByText('Paste the https:// link')).toBeVisible();
  await fill(stand, 'Shopee affiliate link', 'https://s.shopee.ph/stand');
  await expect(stand.getByText('Paste the https:// link')).toHaveCount(0);
  await expect(stand.getByText(/^Price as of /)).toBeVisible();
  await fill(stand, 'Price (₱)', 'cheap');
  await expect(stand.getByText('Type a price like 249')).toBeVisible();
  await fill(stand, 'Price (₱)', '1249.5');
  await expect(stand.getByLabel('Price (₱)')).toHaveValue('1249.50');

  await fill(paper, 'Name', 'Glossy photo paper');
  await fill(paper, 'Price (₱)', '249');
  await fill(paper, 'Shopee affiliate link', 'https://s.shopee.ph/paper');
  await expect(paper.getByRole('button', { name: 'Still ₱249 today' })).toBeVisible();
  await expect(paper.getByRole('status')).toHaveCount(0); // "Saved" comes and goes
  await page.screenshot({ path: 'e2e/shots/47-admin-products.png', fullPage: true });

  // Drag the stand below the paper; the order survives a reload.
  await dragOnto(page, stand, paper);
  await expect(cards.nth(0).getByLabel('Name')).toHaveValue('Glossy photo paper');
  await page.reload();
  await expect(cards.nth(0).getByLabel('Name')).toHaveValue('Glossy photo paper');
  await expect(cards.nth(1).getByLabel('Name')).toHaveValue('Desk calendar stand');
  // Arrow keys on the handle move one place too.
  await cards.nth(1).locator('.product-grip').press('ArrowUp');
  await expect(cards.nth(0).getByLabel('Name')).toHaveValue('Desk calendar stand');

  // A visitor (not signed in) sees both in the Print Kit tab, in that order, with picture and price.
  const visitor = await browser.newPage();
  await visitor.goto('/');
  await visitor.getByRole('button', { name: 'Print Kit', exact: true }).click();
  const links = visitor.getByTestId('supply-links').getByRole('link');
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveAttribute('href', 'https://s.shopee.ph/stand');
  await expect(links.nth(0)).toHaveAttribute('rel', /sponsored/);
  await expect(links.nth(0)).toContainText('₱1,249.50');
  await expect(links.nth(0)).toContainText(/Price as of/);
  await expect(links.nth(0).locator('img')).toBeVisible();
  await expect.poll(() => links.nth(0).locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  await expect(links.nth(1)).toContainText('Glossy photo paper');
  await expect(visitor.getByTestId('affiliate-note')).toBeVisible();
  await visitor.screenshot({ path: 'e2e/shots/48-support-products.png' });

  // Hidden products leave the Print Kit tab; deleted ones leave the list.
  await cards.nth(1).getByLabel('Show').uncheck();
  await expect(cards.nth(1)).toHaveClass(/\boff\b/);
  await visitor.reload();
  await visitor.getByRole('button', { name: 'Print Kit', exact: true }).click();
  await expect(links).toHaveCount(1);
  await cards.nth(1).getByRole('button', { name: 'Delete' }).click();
  await cards.nth(1).getByRole('button', { name: 'Click again to delete' }).click();
  await expect(cards).toHaveCount(1);
  await visitor.close();
  expect(errors).toEqual([]);
});

test('members can’t open the products page', async ({ page }) => {
  await signIn(page, await newUser('Member'));
  await page.getByRole('button', { name: 'Account' }).click();
  await expect(page.getByRole('menuitem', { name: 'Products' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.goto('/admin/products');
  await expect(page.getByText('This page is for the site admin.')).toBeVisible();
});

test('pasting a Shopee link adds the product with its name and picture; a link Shopee won’t read still adds it', async ({ page }) => {
  const boss = await newUser('Boss');
  await setAccount(boss.id, { admin: true });
  await signIn(page, boss);
  const png = (await makePng(page, '#7b3fa0')).toString('base64');
  // Shopee itself isn't called from the tests: the server's answer is stood in for.
  let reply: object = { name: 'Plastic ring binder A4', image: `data:image/png;base64,${png}` };
  let status = 200;
  await page.route('**/api/product-preview', (r) => r.fulfill({ status, json: reply }));
  await page.goto('/admin/products');
  const box = page.getByTestId('product-link').getByRole('textbox');
  const cards = page.getByTestId('product');
  await expect(page.getByText('Loading products…')).toHaveCount(0);
  const before = await cards.count();

  await box.fill('https://example.com/not-shopee');
  await page.getByTestId('product-link').getByRole('button', { name: 'Add' }).click();
  await expect(page.locator('.auth-error')).toHaveText('Paste a Shopee link, like https://s.shopee.ph/…');

  // Pasting a link adds it straight away.
  await box.fill('');
  await box.focus();
  await box.evaluate((el) => {
    const data = new DataTransfer();
    data.setData('text/plain', 'https://s.shopee.ph/binder');
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expect(cards).toHaveCount(before + 1);
  const binder = cards.last();
  await expect(binder.getByLabel('Name')).toHaveValue('Plastic ring binder A4');
  await expect(binder.getByLabel('Shopee affiliate link')).toHaveValue('https://s.shopee.ph/binder');
  await expect.poll(() => binder.locator('.product-img img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  await expect(box).toHaveValue('');
  await page.screenshot({ path: 'e2e/shots/53-product-from-link.png' });

  // Shopee refuses: the product still comes in with its link, to finish by hand.
  status = 502;
  reply = { error: 'Couldn’t read that Shopee link.' };
  await box.fill('https://s.shopee.ph/stand');
  await box.press('Enter');
  await expect(cards).toHaveCount(before + 2);
  await expect(cards.last().getByLabel('Shopee affiliate link')).toHaveValue('https://s.shopee.ph/stand');
  await expect(cards.last().getByLabel('Name')).toHaveValue('');
  await expect(page.locator('.auth-error')).toContainText('added with just its link');
});

test('only the admin can use the Shopee link reader', async ({ page }) => {
  await signIn(page, await newUser('Member'));
  const token = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'));
    return key ? (JSON.parse(localStorage.getItem(key)!) as { access_token: string }).access_token : '';
  });
  expect(token).not.toBe('');
  const ask = (auth: string) => page.request.post('/api/product-preview', { headers: auth ? { Authorization: `Bearer ${auth}` } : {}, data: { url: 'https://s.shopee.ph/x' } });
  expect((await ask('')).status()).toBe(401);
  expect((await ask(token)).status()).toBe(403);
});
