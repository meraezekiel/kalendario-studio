import { expect, type Page, test } from '@playwright/test';
import { openStudio } from './helpers';

/** Previews the support settings (normally edited in src/lib/support/config.ts). */
const preview = (page: Page, cfg: object) => page.addInitScript((c) => void (window.__KS_SUPPORT__ = c), cfg);

async function exportPng(page: Page) {
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PNG' }).click();
  await dl;
}

test.describe('Support', () => {
  test('Support tab lists print supplies and stays quiet by default', async ({ page }) => {
    const errors = await openStudio(page);
    await page.getByRole('button', { name: 'Support' }).click();
    const links = page.getByTestId('supply-links').getByRole('link');
    await expect(links.first()).toBeVisible();
    expect(await links.count()).toBeGreaterThan(2);
    await expect(links.first()).toHaveAttribute('target', '_blank');
    await expect(links.first()).toHaveAttribute('rel', /sponsored/);
    // No coffee page is set in the shipped config, so no coffee button and no affiliate note.
    await expect(page.getByTestId('coffee-link')).toHaveCount(0);
    await expect(page.getByTestId('affiliate-note')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('thank-you note shows once after the first export, never again', async ({ page }) => {
    await preview(page, { coffeeUrl: 'https://buymeacoffee.com/example', affiliate: true });
    const errors = await openStudio(page);
    await expect(page.getByTestId('thanks-note')).toHaveCount(0);

    await page.getByRole('button', { name: 'Support' }).click();
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

  test('Print supplies button in the note opens the Support tab', async ({ page }) => {
    await openStudio(page);
    await exportPng(page);
    await page.getByTestId('thanks-note').getByRole('button', { name: 'Print supplies' }).click();
    await expect(page.getByTestId('thanks-note')).toHaveCount(0);
    await expect(page.getByTestId('supply-links')).toBeVisible();
  });

  test('with nothing configured there is no Support tab and no note', async ({ page }) => {
    await preview(page, { coffeeUrl: '', links: [] });
    await openStudio(page);
    await expect(page.getByRole('button', { name: 'Support' })).toHaveCount(0);
    await exportPng(page);
    await page.waitForTimeout(4500); // longer than the note's delay
    await expect(page.getByTestId('thanks-note')).toHaveCount(0);
  });
});
