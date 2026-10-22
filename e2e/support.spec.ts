import { expect, type Page, test } from '@playwright/test';
import { openStudio } from './helpers';

/** Previews the support settings (normally src/lib/support/config.ts, and the products from /admin/products). */
const preview = (page: Page, cfg: object) => page.addInitScript((c) => void (window.__KS_SUPPORT__ = c), cfg);

const product = (id: string, name: string, price: number | null, extra = {}) => ({
  id, name, note: '', price, price_checked_at: '2026-10-22T03:00:00Z', url: `https://s.shopee.ph/${id}`, image: null, position: 0, hidden: false, ...extra,
});
const PRODUCTS = [
  product('stand', 'Desk calendar stand', 1249.5, { position: 2, note: 'For 8×5 in desk calendars' }),
  product('paper', 'Glossy photo paper', 249, { position: 1 }),
  product('hidden', 'Hidden one', 10, { hidden: true }),
  product('unfinished', 'No link yet', null, { url: '' }),
];

async function exportPng(page: Page) {
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PNG' }).click();
  await dl;
}

test.describe('Print Kit', () => {
  test('Print Kit tab lists the visible print supplies in order, with price and affiliate note', async ({ page }) => {
    await preview(page, { products: PRODUCTS });
    const errors = await openStudio(page);
    await page.getByRole('button', { name: 'Print Kit', exact: true }).click();
    const links = page.getByTestId('supply-links').getByRole('link');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toContainText('Glossy photo paper');
    await expect(links.nth(0)).toContainText('₱249');
    await expect(links.nth(1)).toContainText('₱1,249.50');
    await expect(links.nth(1)).toContainText('Price as of Oct 22');
    await expect(links.nth(1)).toHaveAttribute('href', 'https://s.shopee.ph/stand');
    await expect(links.first()).toHaveAttribute('target', '_blank');
    await expect(links.first()).toHaveAttribute('rel', /sponsored/);
    await expect(page.getByTestId('affiliate-note')).toBeVisible();
    // No coffee page is set in the shipped config.
    await expect(page.getByTestId('coffee-link')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('thank-you note shows once after the first export, never again', async ({ page }) => {
    await preview(page, { coffeeUrl: 'https://buymeacoffee.com/example', products: PRODUCTS });
    const errors = await openStudio(page);
    await expect(page.getByTestId('thanks-note')).toHaveCount(0);

    await page.getByRole('button', { name: 'Print Kit', exact: true }).click();
    await expect(page.getByTestId('coffee-link')).toHaveAttribute('href', 'https://buymeacoffee.com/example');
    await expect(page.getByTestId('affiliate-note')).toBeVisible();
    await page.screenshot({ path: 'e2e/shots/34-support.png' });

    await exportPng(page);
    const note = page.getByTestId('thanks-note');
    await expect(note).toBeVisible();
    await expect(note.getByRole('link', { name: /Buy me a coffee/ })).toHaveAttribute('target', '_blank');
    await page.screenshot({ path: 'e2e/shots/35-thanks.png' });
    // It never blocks the editor: the page can still be edited while it shows.
    await page.getByRole('button', { name: 'Templates' }).click();
    await note.getByRole('button', { name: 'Close' }).click();
    await expect(note).toHaveCount(0);

    await exportPng(page);
    await page.waitForTimeout(4500); // longer than the note's delay
    await expect(note).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.ph .page')).toBeVisible();
    await exportPng(page);
    await page.waitForTimeout(4500); // longer than the note's delay
    await expect(note).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('Print Kit button in the note opens the Print Kit tab', async ({ page }) => {
    await preview(page, { products: PRODUCTS });
    await openStudio(page);
    await exportPng(page);
    await page.getByTestId('thanks-note').getByRole('button', { name: 'Print Kit', exact: true }).click();
    await expect(page.getByTestId('thanks-note')).toHaveCount(0);
    await expect(page.getByTestId('supply-links')).toBeVisible();
  });

  test('the design service offer shows only when a Messenger link is set', async ({ page }) => {
    await preview(page, { products: PRODUCTS, designServiceUrl: 'https://m.me/example' });
    await openStudio(page);
    await page.getByRole('button', { name: 'Print Kit', exact: true }).click();
    const offer = page.getByTestId('design-service');
    await expect(offer).toContainText('Busy? I’ll design it for you.');
    await expect(offer.getByRole('link', { name: 'Message me' })).toHaveAttribute('href', 'https://m.me/example');
    await page.screenshot({ path: 'e2e/shots/50-design-service.png' });
    await page.reload();
    await page.addInitScript(() => void (window.__KS_SUPPORT__ = { ...window.__KS_SUPPORT__, designServiceUrl: '' }));
    await page.reload();
    await page.getByRole('button', { name: 'Print Kit', exact: true }).click();
    await expect(page.getByTestId('design-service')).toHaveCount(0);
  });

  test('Support the dev shows the GCash QR only when tapped', async ({ page }) => {
    await preview(page, { gcashQr: '/graphics/fluent/airplane.svg', gcashName: 'J. L. A.' });
    const errors = await openStudio(page);
    await page.getByRole('button', { name: 'Print Kit', exact: true }).click();
    await expect(page.getByTestId('gcash-qr')).toHaveCount(0);
    await page.getByTestId('gcash-button').click();
    await expect(page.getByTestId('gcash-qr').getByRole('img', { name: 'GCash QR code' })).toBeVisible();
    await expect(page.getByTestId('gcash-qr')).toContainText('Scan with GCash · J. L. A.');
    await page.getByTestId('gcash-button').click();
    await expect(page.getByTestId('gcash-qr')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('with nothing configured there is no Print Kit tab and the note only offers to save', async ({ page }) => {
    await preview(page, { coffeeUrl: '', gcashQr: '', designServiceUrl: '', printOrderUrl: '', products: [] });
    await openStudio(page);
    await expect(page.getByRole('button', { name: 'Print Kit', exact: true })).toHaveCount(0);
    await expect(page.getByTestId('order-prints')).toHaveCount(0);
    await exportPng(page);
    const note = page.getByTestId('thanks-note');
    await expect(note).toBeVisible();
    await expect(note.getByRole('link')).toHaveCount(0);
    await expect(note.getByRole('button', { name: 'Print Kit', exact: true })).toHaveCount(0);
    const dl = page.waitForEvent('download');
    await note.getByRole('button', { name: 'Save design file' }).click();
    expect((await dl).suggestedFilename()).toMatch(/\.kalendaryo$/);
    await expect(note).toHaveCount(0);
  });
});
